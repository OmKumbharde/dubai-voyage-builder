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

  const getSelectedTour = (tourId: string | null) => {
    return tours.find(t => t.id === tourId);
  };

  // Get min and max dates from quote
  const minDate = quote?.travel_dates_from || new Date().toISOString().split('T')[0];
  const maxDate = quote?.travel_dates_to || new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Quote Summary Header */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Trip Itinerary</CardTitle>
            {quote && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Reference:</span>
                  <span className="font-medium">{quote.reference_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest Name:</span>
                  <span className="font-medium">{quote.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Travel Period:</span>
                  <span className="font-medium">
                    {new Date(quote.travel_dates_from).toLocaleDateString()} - {new Date(quote.travel_dates_to).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Passengers:</span>
                  <span className="font-medium">{quote.adults} Adult(s)</span>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            <p>Please arrange your preferred tour schedule below. Select a tour for each day and choose your preferred date within your travel period.</p>
          </CardContent>
        </Card>

        {/* Itinerary List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Tour Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {itineraryItems.map((item, index) => {
              const selectedTour = getSelectedTour(item.tour_id);
              return (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Day {index + 1}</span>
                    {itineraryItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItineraryItem(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Select Tour</Label>
                    <select
                      value={item.tour_id || ''}
                      onChange={(e) => updateItineraryItem(index, 'tour_id', e.target.value)}
                      className="w-full p-2 rounded-md border bg-background"
                    >
                      <option value="">-- Choose a tour --</option>
                      {tours.map(tour => (
                        <option key={tour.id} value={tour.id}>
                          {tour.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTour && (
                    <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-primary/20">
                      <p className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Duration: {selectedTour.duration}
                      </p>
                      {selectedTour.description && (
                        <p className="line-clamp-2">{selectedTour.description}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tour Date</Label>
                    <Input
                      type="date"
                      value={item.tour_date}
                      onChange={(e) => updateItineraryItem(index, 'tour_date', e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="w-full"
                    />
                  </div>

                  {item.notes && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateItineraryItem(index, 'notes', e.target.value)}
                        className="w-full p-2 rounded-md border bg-background text-sm min-h-[60px] resize-none"
                        placeholder="Any special requests or notes..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={addNewItineraryItem}
            variant="outline"
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Day
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Submit Itinerary'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerary;