import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar, GripVertical, Plus, Trash2, Save, Package } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ItineraryItem {
  id: string;
  tour_id: string | null;
  tour_date: string;
  notes: string;
}

interface Tour {
  id: string;
  name: string;
  description: string;
  duration: string;
  type: string;
}

const SortableItineraryItem = ({ 
  item, 
  index, 
  tour, 
  onUpdate, 
  onRemove, 
  minDate, 
  maxDate,
  availableTours 
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-3">
        <div 
          {...attributes} 
          {...listeners} 
          className="flex items-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                  Day {index + 1}
                </span>
                <Input
                  type="date"
                  value={item.tour_date}
                  onChange={(e) => onUpdate(item.id, 'tour_date', e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="flex-1"
                />
              </div>

              <select
                value={item.tour_id || ''}
                onChange={(e) => onUpdate(item.id, 'tour_id', e.target.value)}
                className="w-full p-2 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select Tour --</option>
                {availableTours.map((t: Tour) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type === 'private' ? 'Private' : 'Group'})
                  </option>
                ))}
              </select>

              {tour && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">{tour.duration || 'Full day'}</span>
                  </div>
                  {tour.description && (
                    <p className="text-muted-foreground line-clamp-2">{tour.description}</p>
                  )}
                </div>
              )}

              <Textarea
                placeholder="Add notes for this day (optional)"
                value={item.notes}
                onChange={(e) => onUpdate(item.id, 'notes', e.target.value)}
                className="mt-2 min-h-[60px] text-sm"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SharedItinerary = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, [quoteId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading itinerary for quote ID:', quoteId);
      
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .maybeSingle();
      
      if (quoteError) {
        console.error('Error fetching quote:', quoteError);
        throw quoteError;
      }
      
      if (!quoteData) {
        toast({
          title: "Quote Not Found",
          description: `No quote found with ID: ${quoteId}`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      setQuote(quoteData);

      // Parse selectedTours from notes field
      let selectedTourIds: string[] = [];
      if (quoteData.notes) {
        try {
          const quoteDataMatch = quoteData.notes.match(/---QUOTE_DATA---\s*\n\s*({[\s\S]*})\s*$/);
          if (quoteDataMatch && quoteDataMatch[1]) {
            const parsedData = JSON.parse(quoteDataMatch[1]);
            if (parsedData.selectedTours && Array.isArray(parsedData.selectedTours)) {
              selectedTourIds = parsedData.selectedTours.map((t: any) => t.id);
            }
          }
        } catch (e) {
          console.error('Error parsing quote data:', e);
        }
      }

      // Load only the tours that are in this quote
      if (selectedTourIds.length > 0) {
        const { data: toursData, error: toursError } = await supabase
          .from('tours')
          .select('*')
          .in('id', selectedTourIds);
        
        if (toursError) throw toursError;
        setAvailableTours(toursData || []);
      } else {
        setAvailableTours([]);
        toast({
          title: "No Tours Found",
          description: "This quote doesn't have any tours selected.",
          variant: "destructive"
        });
      }

      // Load existing itinerary
      const { data: itineraryData, error: itineraryError } = await supabase
        .from('itineraries')
        .select('*')
        .eq('quote_id', quoteId)
        .order('tour_date', { ascending: true });
      
      if (itineraryError) throw itineraryError;
      
      if (itineraryData && itineraryData.length > 0) {
        setItineraryItems(itineraryData.map(item => ({
          id: item.id,
          tour_id: item.tour_id,
          tour_date: item.tour_date,
          notes: item.notes || ''
        })));
      } else if (selectedTourIds.length > 0) {
        // Initialize with one empty item
        addNewItem();
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

  const addNewItem = () => {
    const startDate = quote?.travel_dates_from || new Date().toISOString().split('T')[0];
    const newItem: ItineraryItem = {
      id: `temp-${Date.now()}`,
      tour_id: null,
      tour_date: startDate,
      notes: ''
    };
    setItineraryItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItineraryItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ItineraryItem, value: any) => {
    setItineraryItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItineraryItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);

      // Validate that all items have tours selected
      const invalidItems = itineraryItems.filter(item => !item.tour_id);
      if (invalidItems.length > 0) {
        toast({
          title: "Validation Error",
          description: "Please select a tour for all days or remove empty days",
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }

      console.log('Deleting existing itinerary for quote:', quoteId);
      
      // Delete existing itinerary items
      const { error: deleteError } = await supabase
        .from('itineraries')
        .delete()
        .eq('quote_id', quoteId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`Delete failed: ${deleteError.message}`);
      }

      console.log('Preparing items to insert:', itineraryItems.length);

      // Insert new itinerary items
      const itemsToInsert = itineraryItems.map((item, index) => {
        const selectedTour = availableTours.find(t => t.id === item.tour_id);
        const insertItem = {
          quote_id: quoteId,
          tour_id: item.tour_id,
          tour_date: item.tour_date,
          start_time: selectedTour?.duration?.split('-')?.[0]?.trim() || '09:00',
          end_time: selectedTour?.duration?.split('-')?.[1]?.trim() || '17:00',
          notes: item.notes || null
        };
        console.log(`Item ${index + 1}:`, insertItem);
        return insertItem;
      });

      console.log('Inserting items:', itemsToInsert);

      const { data: insertData, error: insertError } = await supabase
        .from('itineraries')
        .insert(itemsToInsert)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        throw new Error(`Insert failed: ${insertError.message} (Code: ${insertError.code})`);
      }

      console.log('Successfully inserted:', insertData);

      toast({
        title: "Success",
        description: "Itinerary saved successfully!"
      });

      await loadData();
    } catch (error: any) {
      console.error('Error saving itinerary:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save itinerary",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  if (!quote && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-destructive mb-2">Quote Not Found</p>
              <p className="text-sm text-muted-foreground">
                The quote you're looking for doesn't exist or has been removed.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Quote ID: {quoteId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minDate = quote.travel_dates_from || new Date().toISOString().split('T')[0];
  const maxDate = quote.travel_dates_to || new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">Trip Itinerary</CardTitle>
              <Package className="h-8 w-8 text-primary" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Booking Reference</p>
                <p className="font-semibold">{quote.reference_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Guest Name</p>
                <p className="font-semibold">{quote.client_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Travel Dates</p>
                <p className="font-medium text-sm">
                  {new Date(minDate).toLocaleDateString('en-GB')} - {new Date(maxDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Passengers</p>
                <p className="font-medium text-sm">{quote.adults} Adult(s){quote.cwb > 0 && `, ${quote.cwb} Child(ren)`}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm">
              📅 Arrange your tour schedule by dragging items. Select a tour and date for each day.
            </p>
          </CardContent>
        </Card>

        {/* Tours Available */}
        {availableTours.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-2">Tours Included in Your Package:</p>
              <div className="flex flex-wrap gap-2">
                {availableTours.map(tour => (
                  <span key={tour.id} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {tour.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itinerary List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {itineraryItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No days added yet. Click "Add Day" to start planning.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={itineraryItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {itineraryItems.map((item, index) => {
                    const tour = availableTours.find(t => t.id === item.tour_id);
                    return (
                      <SortableItineraryItem
                        key={item.id}
                        item={item}
                        index={index}
                        tour={tour}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        minDate={minDate}
                        maxDate={maxDate}
                        availableTours={availableTours}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 sticky bottom-4">
          <Button
            onClick={addNewItem}
            variant="outline"
            className="flex-1"
            disabled={availableTours.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Day
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || itineraryItems.length === 0}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Confirm Itinerary'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedItinerary;
