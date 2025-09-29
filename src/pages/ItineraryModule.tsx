import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  Copy,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Download,
  Send
} from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../hooks/use-toast';
import { format } from 'date-fns';

interface ItineraryItem {
  id: string;
  quote_id: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  tour_id: string;
  notes: string;
}

interface ShareableItinerary {
  id: string;
  share_token: string;
  quote_id: string;
  customer_name: string;
  expires_at: string;
  is_active: boolean;
}

const ItineraryModule = () => {
  const { quotes, tours, isLoading } = useSupabaseData();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [shareableLinks, setShareableLinks] = useState<ShareableItinerary[]>([]);
  const [newItineraryItem, setNewItineraryItem] = useState({
    tour_date: '',
    start_time: '09:00',
    end_time: '17:00',
    tour_id: '',
    notes: ''
  });
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
  const confirmedQuotes = quotes.filter(q => ['confirmed', 'sent'].includes(q.status));

  useEffect(() => {
    if (selectedQuoteId) {
      fetchItineraryItems();
      fetchShareableLinks();
    }
  }, [selectedQuoteId]);

  const fetchItineraryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('quote_id', selectedQuoteId)
        .order('tour_date', { ascending: true });

      if (error) throw error;
      setItineraryItems(data || []);
    } catch (error) {
      console.error('Error fetching itinerary items:', error);
    }
  };

  const fetchShareableLinks = async () => {
    try {
      // This would fetch shareable links from a dedicated table
      // For now, we'll use mock data since the table doesn't exist yet
      setShareableLinks([]);
    } catch (error) {
      console.error('Error fetching shareable links:', error);
    }
  };

  const addItineraryItem = async () => {
    if (!selectedQuoteId || !newItineraryItem.tour_date || !newItineraryItem.tour_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          quote_id: selectedQuoteId,
          tour_date: newItineraryItem.tour_date,
          start_time: newItineraryItem.start_time,
          end_time: newItineraryItem.end_time,
          tour_id: newItineraryItem.tour_id,
          notes: newItineraryItem.notes
        });

      if (error) throw error;

      toast({
        title: "Itinerary Item Added",
        description: "New itinerary item has been added successfully"
      });

      setNewItineraryItem({
        tour_date: '',
        start_time: '09:00',
        end_time: '17:00',
        tour_id: '',
        notes: ''
      });
      setShowNewItemForm(false);
      fetchItineraryItems();
    } catch (error) {
      console.error('Error adding itinerary item:', error);
      toast({
        title: "Error",
        description: "Failed to add itinerary item",
        variant: "destructive"
      });
    }
  };

  const deleteItineraryItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Itinerary item has been removed"
      });

      fetchItineraryItems();
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      toast({
        title: "Error",
        description: "Failed to delete itinerary item",
        variant: "destructive"
      });
    }
  };

  const generateShareableLink = async () => {
    if (!selectedQuoteId || !selectedQuote) {
      toast({
        title: "No Quote Selected",
        description: "Please select a quote first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate a unique token
      const shareToken = `itinerary_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

      // For now, we'll create a shareable URL with the quote ID
      // In a real implementation, this would be stored in a database
      const shareableUrl = `${window.location.origin}/shared-itinerary/${shareToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);
      
      toast({
        title: "Shareable Link Generated",
        description: "Link copied to clipboard! Valid for 30 days."
      });

      // Add to our mock shareable links
      const newLink: ShareableItinerary = {
        id: shareToken,
        share_token: shareToken,
        quote_id: selectedQuoteId,
        customer_name: selectedQuote.customerName,
        expires_at: expiresAt.toISOString(),
        is_active: true
      };

      setShareableLinks(prev => [newLink, ...prev]);
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast({
        title: "Error",
        description: "Failed to generate shareable link",
        variant: "destructive"
      });
    }
  };

  const copyShareableLink = async (shareToken: string) => {
    const shareableUrl = `${window.location.origin}/shared-itinerary/${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const exportItinerary = () => {
    if (!selectedQuote || itineraryItems.length === 0) {
      toast({
        title: "No Data",
        description: "No itinerary items to export",
        variant: "destructive"
      });
      return;
    }

    let content = `DETAILED ITINERARY\n`;
    content += `Customer: ${selectedQuote.customerName}\n`;
    content += `Booking Reference: ${selectedQuote.ticketReference}\n`;
    content += `Generated: ${format(new Date(), 'do MMMM yyyy')}\n\n`;
    content += `=`.repeat(60) + `\n\n`;

    itineraryItems
      .sort((a, b) => new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime())
      .forEach((item, index) => {
        const tour = tours.find(t => t.id === item.tour_id);
        content += `DAY ${index + 1} - ${format(new Date(item.tour_date), 'EEEE, do MMMM yyyy')}\n`;
        content += `Time: ${item.start_time} - ${item.end_time}\n`;
        content += `Activity: ${tour?.name || 'Unknown Tour'}\n`;
        if (tour?.description) {
          content += `Description: ${tour.description}\n`;
        }
        if (item.notes) {
          content += `Notes: ${item.notes}\n`;
        }
        content += `\n${'-'.repeat(40)}\n\n`;
      });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itinerary-${selectedQuote.ticketReference}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Itinerary Exported",
      description: "Detailed itinerary has been downloaded"
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-dubai-gold" />
            Itinerary Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Create detailed itineraries and generate shareable links for customers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedQuoteId && (
            <>
              <Button onClick={generateShareableLink} className="dubai-button-gold flex items-center">
                <Share2 className="mr-2 h-4 w-4" />
                Generate Link
              </Button>
              <Button onClick={exportItinerary} variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quote Selection */}
      <Card className="dubai-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="quote-select">Select Quote for Itinerary</Label>
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger className="dubai-input">
                  <SelectValue placeholder="Choose a confirmed quote..." />
                </SelectTrigger>
                <SelectContent>
                  {confirmedQuotes.map(quote => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.customerName} - {quote.ticketReference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedQuote && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Customer:</strong> {selectedQuote.customerName}</p>
                <p><strong>Travel Dates:</strong> {new Date(selectedQuote.travelDates.startDate).toLocaleDateString()} - {new Date(selectedQuote.travelDates.endDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedQuoteId && (
        <>
          {/* Itinerary Items */}
          <Card className="dubai-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Itinerary Schedule</CardTitle>
                <Button 
                  onClick={() => setShowNewItemForm(!showNewItemForm)}
                  className="dubai-button-primary flex items-center"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add New Item Form */}
              {showNewItemForm && (
                <div className="p-4 rounded-lg border bg-gray-50 mb-6">
                  <h4 className="font-semibold mb-4">Add New Itinerary Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="tour-date">Date</Label>
                      <Input
                        id="tour-date"
                        type="date"
                        value={newItineraryItem.tour_date}
                        onChange={(e) => setNewItineraryItem(prev => ({ ...prev, tour_date: e.target.value }))}
                        className="dubai-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={newItineraryItem.start_time}
                        onChange={(e) => setNewItineraryItem(prev => ({ ...prev, start_time: e.target.value }))}
                        className="dubai-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={newItineraryItem.end_time}
                        onChange={(e) => setNewItineraryItem(prev => ({ ...prev, end_time: e.target.value }))}
                        className="dubai-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tour-select">Tour/Activity</Label>
                      <Select value={newItineraryItem.tour_id} onValueChange={(value) => setNewItineraryItem(prev => ({ ...prev, tour_id: value }))}>
                        <SelectTrigger className="dubai-input">
                          <SelectValue placeholder="Select tour..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tours.map(tour => (
                            <SelectItem key={tour.id} value={tour.id}>
                              {tour.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newItineraryItem.notes}
                      onChange={(e) => setNewItineraryItem(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes for this activity..."
                      className="dubai-input"
                    />
                  </div>
                  <div className="flex items-center space-x-3 mt-4">
                    <Button onClick={addItineraryItem} className="dubai-button-primary">
                      Add Item
                    </Button>
                    <Button onClick={() => setShowNewItemForm(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Itinerary Items List */}
              <div className="space-y-4">
                {itineraryItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No itinerary items yet. Add some activities to get started.
                  </div>
                ) : (
                  itineraryItems
                    .sort((a, b) => new Date(a.tour_date).getTime() - new Date(b.tour_date).getTime())
                    .map((item, index) => {
                      const tour = tours.find(t => t.id === item.tour_id);
                      return (
                        <div key={item.id} className="p-4 rounded-lg border bg-gradient-card hover:shadow-card transition-smooth">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4 mb-2">
                                <Badge variant="outline">Day {index + 1}</Badge>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>{format(new Date(item.tour_date), 'EEEE, do MMMM yyyy')}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{item.start_time} - {item.end_time}</span>
                                </div>
                              </div>
                              <h4 className="font-semibold text-lg">{tour?.name || 'Unknown Tour'}</h4>
                              {tour?.description && (
                                <p className="text-sm text-muted-foreground mt-1">{tour.description}</p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-blue-600 mt-2">
                                  <strong>Notes:</strong> {item.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => deleteItineraryItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shareable Links */}
          <Card className="dubai-card">
            <CardHeader>
              <CardTitle>Shareable Links</CardTitle>
            </CardHeader>
            <CardContent>
              {shareableLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No shareable links generated yet. Click "Generate Link" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {shareableLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                      <div>
                        <p className="font-medium">{link.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {format(new Date(link.expires_at), 'do MMMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={link.is_active ? "default" : "secondary"}>
                          {link.is_active ? "Active" : "Expired"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyShareableLink(link.share_token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ItineraryModule;