import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Building2,
  Clock,
  Download,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { toast } from '../hooks/use-toast';
import { VoucherGenerationDialog } from '../components/VoucherGenerationDialog';
import { supabase } from '../integrations/supabase/client';

const BookingCenter = () => {
  const { quotes, tours, isLoading } = useSupabaseData();
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('list');
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedBookingForVoucher, setSelectedBookingForVoucher] = useState<any>(null);

  // Transform quotes into bookings for display using real database structure
  const bookings = quotes.filter(quote => 
    ['confirmed', 'sent'].includes(quote.status)
  ).map(quote => {
    const checkInDate = (quote as any).travel_dates_from || quote.travelDates?.startDate;
    const checkOutDate = (quote as any).travel_dates_to || quote.travelDates?.endDate;
    const nights = checkInDate && checkOutDate ? 
      Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      id: quote.id,
      ticketReference: (quote as any).reference_number || `QT-${quote.id}`,
      customerName: (quote as any).client_name || quote.customerName || 'N/A',
      customerEmail: (quote as any).client_email || quote.customerEmail,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      pax: { 
        adults: (quote as any).adults || quote.paxDetails?.adults || 0, 
        children: ((quote as any).infants || 0) + ((quote as any).cnb || 0) + ((quote as any).cwb || 0) || 
                 (quote.paxDetails?.infants || 0) + (quote.paxDetails?.cnb || 0) + (quote.paxDetails?.cwb || 0)
      },
      status: quote.status,
      totalAmount: (quote as any).total_amount || quote.calculations?.totalCostAED || 0,
      formattedQuote: (quote as any).formatted_quote,
      notes: (quote as any).notes
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sendItineraryLink = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Generate shareable link
    const shareUrl = `${window.location.origin}/shared-itinerary/${bookingId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Link Copied!",
      description: "Share this link with your client to arrange their itinerary",
    });
  };

  const generateVoucher = (booking: any) => {
    const fullQuote = quotes.find(q => q.id === booking.id);
    
    if (!fullQuote) {
      toast({
        title: "Error",
        description: "Could not find booking details",
        variant: "destructive"
      });
      return;
    }

    setSelectedBookingForVoucher(fullQuote);
    setVoucherDialogOpen(true);
  };

  const viewBookingDetails = async (booking: any) => {
    // Find the full quote from quotes
    const fullQuote = quotes.find(q => q.id === booking.id);
    const formattedContent = (fullQuote as any)?.formatted_quote;
    
    if (!formattedContent) {
      toast({
        title: "No Details Available",
        description: "Quote details are not available for this booking. Please generate the quote first.",
        variant: "destructive"
      });
      return;
    }

    // Fetch itinerary items
    const { data: itineraryItems, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('quote_id', booking.id)
      .order('tour_date', { ascending: true });

    let itineraryHTML = '';
    if (itineraryItems && itineraryItems.length > 0) {
      itineraryHTML = `
        <div style="margin-top: 20px;">
          <h3 style="color: #003366; margin-bottom: 15px;">Confirmed Itinerary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Tour</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Pickup Time</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${itineraryItems.map(item => {
                const tour = tours.find(t => t.id === item.tour_id);
                return `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${format(new Date(item.tour_date), 'EEE, do MMM yyyy')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${tour?.name || 'Unknown Tour'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${(tour as any)?.pickupTime || '09:00 AM'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${item.notes || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Booking Details - ${booking.ticketReference}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              .header { text-align: center; margin-bottom: 30px; }
              .booking-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>BOOKING DETAILS</h1>
              <h2>${booking.ticketReference}</h2>
            </div>
            <div class="booking-info">
              <strong>Customer:</strong> ${booking.customerName}<br>
              <strong>Email:</strong> ${booking.customerEmail || 'N/A'}<br>
              ${booking.checkIn && booking.checkOut ? `<strong>Travel Dates:</strong> ${format(new Date(booking.checkIn), 'do MMMM yyyy')} - ${format(new Date(booking.checkOut), 'do MMMM yyyy')}<br>` : ''}
              <strong>Status:</strong> ${booking.status}<br>
              <strong>Total Amount:</strong> AED ${booking.totalAmount.toLocaleString()}
            </div>
            <div>${formattedContent}</div>
            ${itineraryHTML}
            <div style="margin-top: 30px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
              <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const exportBookingReport = async () => {
    const jsPDF = (await import('jspdf')).default;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKING REPORT', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${format(new Date(), 'do MMMM yyyy')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Summary
    let yPos = 45;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUMMARY', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Bookings: ${bookings.length}`, 20, yPos);
    yPos += 7;
    pdf.text(`Total Revenue: AED ${bookings.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}`, 20, yPos);
    
    // Booking Details
    yPos += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BOOKING DETAILS', 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    bookings.forEach((booking, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${booking.customerName} (${booking.ticketReference})`, 20, yPos);
      yPos += 6;
      
      pdf.setFont('helvetica', 'normal');
      if (booking.checkIn && booking.checkOut) {
        pdf.text(`   Dates: ${format(new Date(booking.checkIn), 'dd/MM/yyyy')} - ${format(new Date(booking.checkOut), 'dd/MM/yyyy')}`, 20, yPos);
        yPos += 5;
      }
      pdf.text(`   Pax: ${booking.pax.adults} Adults${booking.pax.children > 0 ? `, ${booking.pax.children} Children` : ''}`, 20, yPos);
      yPos += 5;
      pdf.text(`   Status: ${booking.status}`, 20, yPos);
      yPos += 5;
      pdf.text(`   Amount: AED ${booking.totalAmount.toLocaleString()}`, 20, yPos);
      yPos += 8;
    });
    
    pdf.save(`booking-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({ 
      title: "Report Exported", 
      description: "Booking report PDF has been downloaded" 
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-dubai-gold" />
            Booking Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage confirmed bookings and generate itineraries
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex rounded-lg border">
            <Button
              variant={selectedView === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('list')}
            >
              List View
            </Button>
            <Button
              variant={selectedView === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedView('calendar')}
            >
              Calendar View
            </Button>
          </div>
          <Button onClick={exportBookingReport} className="dubai-button-gold flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-dubai-blue" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {bookings.filter(b => b.status === 'sent').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="dubai-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-dubai-navy">
                  AED {bookings.reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-dubai-navy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Active Bookings</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">Loading bookings...</div>
              ) : bookings.map((booking) => (
                <div key={booking.id} className="p-6 rounded-lg border bg-gradient-card hover:shadow-card transition-smooth">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">
                            {booking.customerName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Booking #{booking.ticketReference}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>

                      {/* Booking Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">Hotel Accommodation</p>
                            <p className="text-sm text-muted-foreground">{booking.nights} nights</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-dubai-blue" />
                          <div>
                            {booking.checkIn && booking.checkOut ? (
                              <>
                                <p className="font-medium">
                                  {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">{booking.nights} nights</p>
                              </>
                            ) : (
                              <p className="font-medium">Date TBD</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Users className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">
                              {booking.pax.adults} Adults
                              {booking.pax.children > 0 && `, ${booking.pax.children} Children`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              AED {booking.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      {booking.customerEmail && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <span className="text-sm font-medium">{booking.customerEmail}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center"
                        onClick={() => viewBookingDetails(booking)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => sendItineraryLink(booking.id)}
                        className="dubai-button-gold flex items-center text-sm"
                      >
                        <Calendar className="mr-2 h-3 w-3" />
                        Send Itinerary Link
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateVoucher(booking)}
                        className="flex items-center text-sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Voucher
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!isLoading && bookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No confirmed bookings yet. Change quote status to "confirmed" or "sent" to see them here.
                </div>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-blue-100">
              <h4 className="font-semibold mb-2">Recent Bookings</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {bookings.filter(b => {
                  if (!b.checkIn) return false;
                  const bookingDate = new Date(b.checkIn);
                  const today = new Date();
                  const diffTime = Math.abs(bookingDate.getTime() - today.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 30;
                }).length} bookings in the last 30 days
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-gradient-to-r from-green-50 to-green-100">
              <h4 className="font-semibold mb-2">Upcoming Check-ins</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {bookings.filter(b => {
                  if (!b.checkIn) return false;
                  const checkInDate = new Date(b.checkIn);
                  const today = new Date();
                  return checkInDate >= today;
                }).length} bookings with future check-ins
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-yellow-100">
              <h4 className="font-semibold mb-2">This Month Revenue</h4>
              <p className="text-sm text-muted-foreground mb-3">
                AED {bookings.filter(b => {
                  if (!b.checkIn) return false;
                  const bookingMonth = new Date(b.checkIn).getMonth();
                  const currentMonth = new Date().getMonth();
                  return bookingMonth === currentMonth;
                }).reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Generation Dialog */}
      {selectedBookingForVoucher && (
        <VoucherGenerationDialog
          isOpen={voucherDialogOpen}
          onClose={() => {
            setVoucherDialogOpen(false);
            setSelectedBookingForVoucher(null);
          }}
          quote={selectedBookingForVoucher}
        />
      )}
    </div>
  );
};

export default BookingCenter;