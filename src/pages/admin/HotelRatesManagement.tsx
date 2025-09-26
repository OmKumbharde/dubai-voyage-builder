import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  Building2, 
  Calendar as CalendarIcon,
  Save,
  Plus
} from 'lucide-react';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '../../hooks/use-toast';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface HotelRate {
  id: string;
  hotel_id: string;
  date: string;
  rate: number;
  inventory: number;
  created_at: string;
  updated_at: string;
}

const HotelRatesManagement = () => {
  const { hotels, isLoading } = useSupabaseData();
  const [selectedHotel, setSelectedHotel] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rates, setRates] = useState<HotelRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [pendingRates, setPendingRates] = useState<{[key: string]: number}>({});
  const [saving, setSaving] = useState(false);

  const fetchRates = async (hotelId: string, date: Date) => {
    if (!hotelId) return;
    
    setLoadingRates(true);
    try {
      const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('hotel_rates')
        .select('*')
        .eq('hotel_id', hotelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch hotel rates",
        variant: "destructive"
      });
    } finally {
      setLoadingRates(false);
    }
  };

  const submitAllRates = async () => {
    if (!selectedHotel || Object.keys(pendingRates).length === 0) return;
    
    setSaving(true);
    try {
      const ratesToUpdate = [];
      const ratesToCreate = [];
      
      for (const [dateStr, rate] of Object.entries(pendingRates)) {
        const existingRate = rates.find(r => r.date === dateStr);
        
        if (existingRate) {
          ratesToUpdate.push({
            id: existingRate.id,
            rate: rate
          });
        } else {
          ratesToCreate.push({
            hotel_id: selectedHotel,
            date: dateStr,
            rate: rate
          });
        }
      }
      
      // Update existing rates
      for (const rateUpdate of ratesToUpdate) {
        const { error } = await supabase
          .from('hotel_rates')
          .update({ rate: rateUpdate.rate })
          .eq('id', rateUpdate.id);
        
        if (error) throw error;
      }
      
      // Create new rates
      if (ratesToCreate.length > 0) {
        const { error } = await supabase
          .from('hotel_rates')
          .insert(ratesToCreate);
          
        if (error) throw error;
      }
      
      // Refresh rates and clear pending changes
      await fetchRates(selectedHotel, selectedDate);
      setPendingRates({});
      
      toast({
        title: "Rates Updated",
        description: `Successfully updated ${Object.keys(pendingRates).length} rates`
      });
    } catch (error) {
      console.error('Error updating rates:', error);
      toast({
        title: "Error",
        description: "Failed to update rates",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRateChange = (dateStr: string, rate: number) => {
    setPendingRates(prev => ({
      ...prev,
      [dateStr]: rate
    }));
  };

  const generateDefaultRates = async () => {
    if (!selectedHotel) return;
    
    const selectedHotelData = hotels.find(h => h.id === selectedHotel);
    if (!selectedHotelData) return;

    try {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);
      const ratesToCreate = [];

      for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayof = date.getDay();
        const isWeekend = dayof === 5 || dayof === 6; // Friday or Saturday

        const baseRate = selectedHotelData.baseRate;
        const weekendMultiplier = isWeekend ? 1.3 : 1;
        const finalRate = Math.round(baseRate * weekendMultiplier);

        ratesToCreate.push({
          hotel_id: selectedHotel,
          date: dateStr,
          rate: finalRate
        });
      }

      const { error } = await supabase
        .from('hotel_rates')
        .upsert(ratesToCreate as any, { 
          onConflict: 'hotel_id,date',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      await fetchRates(selectedHotel, selectedDate);
      
      toast({
        title: "Rates Generated",
        description: `Generated rates for ${format(selectedDate, 'MMMM yyyy')}`
      });
    } catch (error) {
      console.error('Error generating rates:', error);
      toast({
        title: "Error",
        description: "Failed to generate rates",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedHotel) {
      fetchRates(selectedHotel, selectedDate);
    }
  }, [selectedHotel, selectedDate]);

  const selectedHotelData = hotels.find(h => h.id === selectedHotel);
  const groupedRates = rates.reduce((acc, rate) => {
    const key = rate.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, HotelRate[]>);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-dubai-gold" />
            Hotel Rates Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage daily rates and inventory for hotels
          </p>
        </div>
      </div>

      {/* Hotel Selection */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Select Hotel & Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="hotel">Hotel</Label>
              <select
                id="hotel"
                value={selectedHotel}
                onChange={(e) => setSelectedHotel(e.target.value)}
                className="dubai-input"
              >
                <option value="">Select a hotel</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name} - {hotel.location}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Month & Year</Label>
              <div className="flex items-center space-x-4">
                <input
                  type="month"
                  value={format(selectedDate, 'yyyy-MM')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value + '-01'))}
                  className="dubai-input"
                />
                <Button 
                  onClick={generateDefaultRates}
                  disabled={!selectedHotel}
                  className="dubai-button-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Rates
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Calendar View */}
      {selectedHotel && selectedHotelData && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedHotelData.name} - {format(selectedDate, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRates ? (
              <div className="text-center py-8">Loading rates...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6">
                  <div className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span>Hotel Rates</span>
                        <Badge variant="outline">
                          Base Rate: AED {selectedHotelData.baseRate}
                        </Badge>
                      </h3>
                      <Button 
                        onClick={submitAllRates}
                        disabled={Object.keys(pendingRates).length === 0 || saving}
                        className="dubai-button-primary"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : `Submit Changes (${Object.keys(pendingRates).length})`}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {Array.from(
                        { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
                        (_, i) => {
                          const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const dayRates = groupedRates[dateStr] || [];
                          const rate = dayRates[0];
                          
                          return (
                            <div key={dateStr} className="border rounded p-3 space-y-2">
                              <div className="text-sm font-medium">
                                {format(date, 'MMM d')}
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({format(date, 'EEE')})
                                </span>
                              </div>
                              
                              <Input
                                type="number"
                                value={pendingRates[dateStr] ?? rate?.rate ?? ''}
                                onChange={(e) => handleRateChange(dateStr, Number(e.target.value))}
                                className={`text-xs h-8 ${pendingRates[dateStr] !== undefined ? 'border-yellow-400 bg-yellow-50' : ''}`}
                                placeholder="Enter rate"
                              />
                              {pendingRates[dateStr] !== undefined && (
                                <div className="text-xs text-yellow-600">
                                  Modified
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HotelRatesManagement;