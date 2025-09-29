import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, Clock, MapPin, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';

interface ItineraryItem {
  id?: string;
  tour_id: string | null;
  tour_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

const SharedItinerary = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [tours, setTours] = useState<any[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [quoteId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load quote details
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
      
      if (quoteError) throw quoteError;
      setQuote(quoteData);

      // Load tours
      const { data: toursData, error: toursError } = await supabase
        .from('tours')
        .select('*');
      
      if (toursError) throw toursError;
      setTours(toursData || []);

      // Load existing itinerary
      const { data: itineraryData, error: itineraryError } = await supabase
        .from('itineraries')
        .select('*')
        .eq('quote_id', quoteId);
      
      if (itineraryError) throw itineraryError;
      
      if (itineraryData && itineraryData.length > 0) {
        setItineraryItems(itineraryData.map(item => ({
          id: item.id,
          tour_id: item.tour_id,
          tour_date: item.tour_date,
          start_time: item.start_time || '09:00',
          end_time: item.end_time || '17:00',
          notes: item.notes || ''
        })));
      } else {
        // Initialize with empty item
        addNewItineraryItem();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load itinerary data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addNewItineraryItem = () => {
    setItineraryItems(prev => [...prev, {
      tour_id: null,
      tour_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      notes: ''
    }]);
  };

  const removeItineraryItem = (index: number) => {
    setItineraryItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItineraryItem = (index: number, field: keyof ItineraryItem, value: any) => {
    setItineraryItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);

      // Delete existing itinerary items
      const { error: deleteError } = await supabase
        .from('itineraries')
        .delete()
        .eq('quote_id', quoteId);

      if (deleteError) throw deleteError;

      // Insert new itinerary items
      const itemsToInsert = itineraryItems
        .filter(item => item.tour_id) // Only save items with tours selected
        .map(item => ({
          quote_id: quoteId,
          tour_id: item.tour_id,
          tour_date: item.tour_date,
          start_time: item.start_time,
          end_time: item.end_time,
          notes: item.notes
        }));

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('itineraries')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Itinerary saved successfully!"
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to save itinerary",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dubai-gold mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-dubai-gold" />
              Itinerary Planning
            </CardTitle>
            {quote && (
              <div className="text-sm text-muted-foreground mt-2">
                <p><strong>Booking Reference:</strong> {quote.reference_number}</p>
                <p><strong>Client:</strong> {quote.client_name}</p>
                <p><strong>Travel Dates:</strong> {new Date(quote.travel_dates_from).toLocaleDateString()} - {new Date(quote.travel_dates_to).toLocaleDateString()}</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Itinerary Items */}
        <div className="space-y-4">
          {itineraryItems.map((item, index) => (
            <Card key={index} className="dubai-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-dubai-gold" />
                    Day {index + 1}
                  </h3>
                  {itineraryItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItineraryItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`tour-${index}`}>Select Tour</Label>
                    <select
                      id={`tour-${index}`}
                      value={item.tour_id || ''}
                      onChange={(e) => updateItineraryItem(index, 'tour_id', e.target.value)}
                      className="w-full dubai-input"
                    >
                      <option value="">-- Select a tour --</option>
                      {tours.map(tour => (
                        <option key={tour.id} value={tour.id}>
                          {tour.name} ({tour.duration})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor={`date-${index}`}>Date</Label>
                    <Input
                      id={`date-${index}`}
                      type="date"
                      value={item.tour_date}
                      onChange={(e) => updateItineraryItem(index, 'tour_date', e.target.value)}
                      className="dubai-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`start-${index}`}>Start Time</Label>
                    <Input
                      id={`start-${index}`}
                      type="time"
                      value={item.start_time}
                      onChange={(e) => updateItineraryItem(index, 'start_time', e.target.value)}
                      className="dubai-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`end-${index}`}>End Time</Label>
                    <Input
                      id={`end-${index}`}
                      type="time"
                      value={item.end_time}
                      onChange={(e) => updateItineraryItem(index, 'end_time', e.target.value)}
                      className="dubai-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={`notes-${index}`}>Notes</Label>
                    <textarea
                      id={`notes-${index}`}
                      value={item.notes}
                      onChange={(e) => updateItineraryItem(index, 'notes', e.target.value)}
                      className="w-full dubai-input min-h-[80px] resize-none"
                      placeholder="Add any special notes or requirements..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={addNewItineraryItem}
            variant="outline"
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Day
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 dubai-button-primary"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Itinerary'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerary;