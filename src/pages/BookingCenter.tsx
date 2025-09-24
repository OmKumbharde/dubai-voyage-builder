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

const BookingCenter = () => {
  const { quotes, isLoading } = useSupabaseData();
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'calendar' | 'list'>('list');

  // Transform quotes into bookings for display
  const bookings = quotes.filter(quote => quote.status === 'confirmed').map(quote => ({
    id: quote.id,
    ticketReference: quote.ticketReference,
    customerName: quote.customerName,
    hotel: quote.selectedHotel,
    checkIn: quote.travelDates.startDate,
    checkOut: quote.travelDates.endDate,
    nights: Math.ceil((new Date(quote.travelDates.endDate).getTime() - new Date(quote.travelDates.startDate).getTime()) / (1000 * 60 * 60 * 24)),
    pax: { adults: quote.paxDetails.adults, children: quote.paxDetails.infants + quote.paxDetails.cnb + quote.paxDetails.cwb },
    tours: quote.selectedTours.map(tour => tour.name),
    status: 'confirmed',
    totalAmount: quote.calculations.totalCostAED
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateItinerary = (bookingId: string) => {
    // In a real app, this would generate a PDF itinerary
    alert(`Generating itinerary for booking ${bookingId}`);
  };

  const exportBookingReport = () => {
    // In a real app, this would export booking data to PDF/Excel
    alert('Exporting booking report...');
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
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {bookings.filter(b => b.status === 'pending').length}
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
                            <p className="font-medium">{booking.hotel?.name || 'No hotel selected'}</p>
                            <p className="text-sm text-muted-foreground">{booking.hotel?.location || ''}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-dubai-blue" />
                          <div>
                            <p className="font-medium">
                              {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">{booking.nights} nights</p>
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

                      {/* Tours */}
                      {booking.tours.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Tours:</span>
                          <div className="flex flex-wrap gap-1">
                            {booking.tours.map((tour, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tour}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button size="sm" variant="outline" className="flex items-center">
                        <Eye className="mr-2 h-3 w-3" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => generateItinerary(booking.id)}
                        className="dubai-button-gold flex items-center text-sm"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Itinerary
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!isLoading && bookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No confirmed bookings yet. Confirm some quotes to see them here.
                </div>
              )}
            </div>
        </CardContent>
      </Card>

      {/* Itinerary Builder */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Quick Itinerary Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Available Tours</h4>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-4">Loading tours...</div>
                ) : (
                  <div className="space-y-2">
                    {bookings.length > 0 && bookings[0] && bookings[0].tours ? (
                      bookings[0].tours.map((tourName, index) => (
                        <div key={index} className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-smooth">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium">{tourName}</h5>
                              <p className="text-sm text-muted-foreground">Available Tour</p>
                            </div>
                            <Badge variant="secondary">Tour</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No tours available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Itinerary Preview</h4>
              <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 min-h-[200px] flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  Drag tours here to build an itinerary<br />
                  <span className="text-sm">This feature will be fully interactive in the next update</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingCenter;