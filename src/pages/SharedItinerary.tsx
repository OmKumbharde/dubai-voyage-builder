import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  Phone,
  Mail,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ItineraryItem {
  id: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  tour_name: string;
  tour_description: string;
  notes: string;
}

interface SharedItineraryData {
  customer_name: string;
  ticket_reference: string;
  travel_dates_from: string;
  travel_dates_to: string;
  adults: number;
  children: number;
  hotel_name: string;
  items: ItineraryItem[];
}

const SharedItinerary = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [itineraryData, setItineraryData] = useState<SharedItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      fetchSharedItinerary();
    }
  }, [shareToken]);

  const fetchSharedItinerary = async () => {
    try {
      // In a real implementation, this would validate the share token
      // and fetch the associated itinerary data
      
      // For now, we'll create mock data based on the share token
      const mockData: SharedItineraryData = {
        customer_name: "John Smith",
        ticket_reference: "QT-2024-001",
        travel_dates_from: "2024-12-01",
        travel_dates_to: "2024-12-07",
        adults: 2,
        children: 1,
        hotel_name: "Burj Al Arab",
        items: [
          {
            id: "1",
            tour_date: "2024-12-02",
            start_time: "09:00",
            end_time: "16:00",
            tour_name: "Dubai City Tour",
            tour_description: "Explore the highlights of Dubai including Burj Khalifa, Dubai Mall, and traditional souks.",
            notes: "Pickup from hotel lobby at 8:45 AM"
          },
          {
            id: "2",
            tour_date: "2024-12-03",
            start_time: "08:00",
            end_time: "18:00",
            tour_name: "Desert Safari",
            tour_description: "Adventure in the Arabian desert with dune bashing, camel riding, and traditional BBQ dinner.",
            notes: "Bring sunglasses and comfortable shoes"
          },
          {
            id: "3",
            tour_date: "2024-12-04",
            start_time: "10:00",
            end_time: "15:00",
            tour_name: "Abu Dhabi Day Trip",
            tour_description: "Visit the capital of UAE including Sheikh Zayed Mosque and Emirates Palace.",
            notes: "Modest dress code required for mosque visit"
          }
        ]
      };

      setItineraryData(mockData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching shared itinerary:', err);
      setError('Failed to load itinerary. The link may be expired or invalid.');
      setLoading(false);
    }
  };

  const downloadItinerary = () => {
    if (!itineraryData) return;

    let content = `TRAVEL ITINERARY\n`;
    content += `Customer: ${itineraryData.customer_name}\n`;
    content += `Booking Reference: ${itineraryData.ticket_reference}\n`;
    content += `Travel Period: ${format(new Date(itineraryData.travel_dates_from), 'do MMMM yyyy')} - ${format(new Date(itineraryData.travel_dates_to), 'do MMMM yyyy')}\n`;
    content += `Travelers: ${itineraryData.adults} Adults${itineraryData.children > 0 ? `, ${itineraryData.children} Children` : ''}\n`;
    content += `Hotel: ${itineraryData.hotel_name}\n\n`;
    content += `=`.repeat(60) + `\n\n`;

    itineraryData.items
      .sort((a, b) => new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime())
      .forEach((item, index) => {
        content += `DAY ${index + 1} - ${format(new Date(item.tour_date), 'EEEE, do MMMM yyyy')}\n`;
        content += `Time: ${item.start_time} - ${item.end_time}\n`;
        content += `Activity: ${item.tour_name}\n`;
        content += `Description: ${item.tour_description}\n`;
        if (item.notes) {
          content += `Notes: ${item.notes}\n`;
        }
        content += `\n${'-'.repeat(40)}\n\n`;
      });

    content += `CONTACT INFORMATION\n`;
    content += `Dubai Travel Company\n`;
    content += `Phone: +971 4 123 4567\n`;
    content += `Email: info@dubaitravel.com\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerary-${itineraryData.ticket_reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-dubai-gold mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Itinerary Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!itineraryData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-dubai-navy">Dubai Travel Company</h1>
              <p className="text-muted-foreground">Your Complete Travel Itinerary</p>
            </div>
            <Button onClick={downloadItinerary} className="dubai-button-gold flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Customer Information */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-dubai-gold" />
              Booking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg">{itineraryData.customer_name}</h3>
                <p className="text-muted-foreground">Booking Reference: {itineraryData.ticket_reference}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-dubai-blue" />
                    <span className="text-sm">
                      {format(new Date(itineraryData.travel_dates_from), 'do MMMM yyyy')} - 
                      {format(new Date(itineraryData.travel_dates_to), 'do MMMM yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-dubai-blue" />
                    <span className="text-sm">
                      {itineraryData.adults} Adults
                      {itineraryData.children > 0 && `, ${itineraryData.children} Children`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-dubai-blue" />
                    <span className="text-sm">{itineraryData.hotel_name}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-dubai-cream to-white p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-dubai-blue" />
                    <span>+971 4 123 4567</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-dubai-blue" />
                    <span>info@dubaitravel.com</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-dubai-blue" />
                    <span>Dubai, United Arab Emirates</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Schedule */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-dubai-gold" />
              Daily Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {itineraryData.items
                .sort((a, b) => new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime())
                .map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* Day connector line */}
                    {index < itineraryData.items.length - 1 && (
                      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-dubai-gold opacity-30"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-dubai-gold rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-gradient-card rounded-lg p-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-foreground">{item.tour_name}</h3>
                          <Badge variant="outline">
                            {format(new Date(item.tour_date), 'EEE, MMM do')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{item.start_time} - {item.end_time}</span>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground mb-3">{item.tour_description}</p>
                        
                        {item.notes && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-sm text-blue-800">
                              <strong>Important Note:</strong> {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What to Bring</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Valid passport or Emirates ID</li>
                  <li>• Comfortable walking shoes</li>
                  <li>• Sunglasses and sunscreen</li>
                  <li>• Camera for memorable moments</li>
                  <li>• Light jacket for air-conditioned venues</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Emergency Contacts</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Dubai Travel 24/7 Hotline:</p>
                  <p className="font-medium text-dubai-navy">+971 50 123 4567</p>
                  <p className="mt-2">Emergency Services:</p>
                  <p className="font-medium text-dubai-navy">999 (Police/Fire/Ambulance)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-6">
          <p>© 2024 Dubai Travel Company. All rights reserved.</p>
          <p className="mt-1">Have a wonderful trip!</p>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerary;