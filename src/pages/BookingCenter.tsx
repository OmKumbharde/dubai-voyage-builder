import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Building2,
  Clock,
  Download,
  Eye,
  CheckCircle,
  Search
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
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedBookingForVoucher, setSelectedBookingForVoucher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Transform quotes into bookings and apply filters
  const allBookings = quotes.filter(quote => 
    ['confirmed', 'sent'].includes(quote.status)
  ).map(quote => {
    const checkInDate = (quote as any).travel_dates_from || quote.travelDates?.startDate;
    const checkOutDate = (quote as any).travel_dates_to || quote.travelDates?.endDate;
    const nights = checkInDate && checkOutDate ? 
      Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      id: quote.id,
      ticketReference: (quote as any).ticket_reference || (quote as any).reference_number || `QT-${quote.id.substring(0, 8)}`,
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

  // Apply filters
  const bookings = allBookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      (booking.ticketReference && booking.ticketReference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
    const booking = allBookings.find(b => b.id === bookingId);
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
    const fullQuote = quotes.find(q => q.id === booking.id);
    
    if (!fullQuote) {
      toast({
        title: "No Details Available",
        description: "Booking not found",
        variant: "destructive"
      });
      return;
    }

    // Fetch itinerary items
    const { data: itineraryItems } = await supabase
      .from('itineraries')
      .select('*')
      .eq('quote_id', booking.id)
      .order('tour_date', { ascending: true });

    const quoteAny = fullQuote as any;
    const selectedHotel = quoteAny.selectedHotels?.[0] || quoteAny.selectedHotel;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Booking Details - ${booking.ticketReference}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                padding: 40px; 
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              }
              .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              }
              .header { 
                text-align: center; 
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #C8A15C;
              }
              .header h1 {
                color: #003366;
                font-size: 32px;
                margin-bottom: 10px;
                letter-spacing: 1px;
              }
              .header h2 {
                color: #C8A15C;
                font-size: 20px;
                font-weight: 500;
              }
              .section {
                margin-bottom: 30px;
              }
              .section-title {
                color: #003366;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #f0f0f0;
              }
              .info-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 20px;
              }
              .info-item {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #C8A15C;
              }
              .info-label {
                font-weight: 600;
                color: #003366;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
              }
              .info-value {
                color: #333;
                font-size: 16px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              thead {
                background: linear-gradient(135deg, #003366 0%, #004488 100%);
                color: white;
              }
              th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
              }
              tr:last-child td {
                border-bottom: none;
              }
              tbody tr:hover {
                background: #f8f9fa;
              }
              .btn-container {
                margin-top: 40px;
                text-align: center;
                padding-top: 20px;
                border-top: 2px solid #f0f0f0;
              }
              button {
                padding: 12px 30px;
                margin: 0 10px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .btn-print {
                background: linear-gradient(135deg, #003366 0%, #004488 100%);
                color: white;
              }
              .btn-print:hover {
                box-shadow: 0 4px 15px rgba(0, 51, 102, 0.3);
                transform: translateY(-2px);
              }
              .btn-close {
                background: #6c757d;
                color: white;
              }
              .btn-close:hover {
                background: #5a6268;
              }
              @media print {
                body { 
                  background: white; 
                  padding: 0; 
                }
                .container {
                  box-shadow: none;
                  padding: 20px;
                }
                .btn-container { 
                  display: none; 
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>BOOKING DETAILS</h1>
                <h2>TKT ${booking.ticketReference}</h2>
              </div>

              <div class="section">
                <div class="section-title">Guest Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Guest Name</div>
                    <div class="info-value">${booking.customerName}</div>
                  </div>
                  ${booking.customerEmail ? `
                  <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${booking.customerEmail}</div>
                  </div>
                  ` : ''}
                  <div class="info-item">
                    <div class="info-label">Total Pax</div>
                    <div class="info-value">${booking.pax.adults} Adults${booking.pax.children > 0 ? `, ${booking.pax.children} Children` : ''}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Booking Status</div>
                    <div class="info-value" style="color: ${booking.status === 'confirmed' ? '#10b981' : '#3b82f6'}; font-weight: 600;">${booking.status.toUpperCase()}</div>
                  </div>
                </div>
              </div>

              ${selectedHotel ? `
              <div class="section">
                <div class="section-title">Accommodation Details</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Hotel</div>
                    <div class="info-value">${selectedHotel.name}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Location</div>
                    <div class="info-value">${selectedHotel.location || 'Dubai'}</div>
                  </div>
                  ${booking.checkIn ? `
                  <div class="info-item">
                    <div class="info-label">Check In</div>
                    <div class="info-value">${format(new Date(booking.checkIn), 'EEEE, do MMMM yyyy')}</div>
                  </div>
                  ` : ''}
                  ${booking.checkOut ? `
                  <div class="info-item">
                    <div class="info-label">Check Out</div>
                    <div class="info-value">${format(new Date(booking.checkOut), 'EEEE, do MMMM yyyy')}</div>
                  </div>
                  ` : ''}
                  ${booking.nights ? `
                  <div class="info-item">
                    <div class="info-label">Nights</div>
                    <div class="info-value">${booking.nights} Night${booking.nights !== 1 ? 's' : ''}</div>
                  </div>
                  ` : ''}
                  <div class="info-item">
                    <div class="info-label">Number of Rooms</div>
                    <div class="info-value">${Math.ceil(booking.pax.adults / 2)} Room${Math.ceil(booking.pax.adults / 2) !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>
              ` : ''}

              ${itineraryItems && itineraryItems.length > 0 ? `
              <div class="section">
                <div class="section-title">Confirmed Itinerary</div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tour / Activity</th>
                      <th>Pickup Time</th>
                      <th>Drop Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itineraryItems.map(item => {
                      const tour = tours.find(t => t.id === item.tour_id);
                      return `
                        <tr>
                          <td style="font-weight: 600;">${format(new Date(item.tour_date), 'EEE, do MMM yyyy')}</td>
                          <td>${tour?.name || 'Unknown Tour'}</td>
                          <td>${tour?.pickupTime || '09:00 AM'}</td>
                          <td>${tour?.dropTime || '05:00 PM'}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}

              <div class="section">
                <div class="info-grid">
                  <div class="info-item" style="grid-column: 1 / -1; border-left: 4px solid #003366;">
                    <div class="info-label">Total Amount</div>
                    <div class="info-value" style="font-size: 24px; color: #003366; font-weight: 700;">AED ${booking.totalAmount.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div class="btn-container">
                <button onclick="window.print()" class="btn-print">Print Details</button>
                <button onclick="window.close()" class="btn-close">Close</button>
              </div>
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
        <div className="flex items-center gap-3">
          <Button onClick={exportBookingReport} className="dubai-button-gold flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <Card className="dubai-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="search" className="text-xs font-medium mb-1.5 block">
                Search by TKT Reference or Customer Name
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search bookings..."
                  className="pl-10 h-9 dubai-input"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="statusFilter" className="text-xs font-medium mb-1.5 block">
                Filter by Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 dubai-input">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                            {booking.ticketReference ? `TKT ${booking.ticketReference}` : `Ref ${booking.id.substring(0, 8)}`}
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
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No bookings match your search criteria.'
                    : 'No confirmed bookings yet. Change quote status to "confirmed" or "sent" to see them here.'}
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