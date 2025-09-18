import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  Calculator, 
  Calendar, 
  Users, 
  Building2, 
  MapPin, 
  Plus,
  Minus,
  Download,
  Save
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PaxDetails, Quote } from '../types';
import { toast } from '../hooks/use-toast';

const QuoteTool = () => {
  const { state, dispatch } = useAppContext();
  const { hotels, tours, inclusions } = state;

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [travelDates, setTravelDates] = useState({
    startDate: '',
    endDate: ''
  });
  const [paxDetails, setPaxDetails] = useState<PaxDetails>({
    adults: 2,
    infants: 0,
    cnb: 0,
    cwb: 0
  });
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);
  const [selectedInclusionIds, setSelectedInclusionIds] = useState<string[]>([]);

  const selectedHotel = hotels.find(h => h.id === selectedHotelId);
  const selectedRoom = selectedHotel?.rooms.find(r => r.id === selectedRoomId);
  const selectedTours = tours.filter(t => selectedTourIds.includes(t.id));
  const selectedInclusions = inclusions.filter(i => selectedInclusionIds.includes(i.id));

  const calculateQuote = () => {
    if (!selectedHotel || !selectedRoom || !travelDates.startDate || !travelDates.endDate) {
      return null;
    }

    const nights = Math.ceil((new Date(travelDates.endDate).getTime() - new Date(travelDates.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const totalPax = paxDetails.adults + paxDetails.cwb;
    const roomsNeeded = Math.ceil(totalPax / selectedRoom.capacity);
    const extraBedsNeeded = Math.max(0, totalPax - (roomsNeeded * selectedRoom.capacity));

    // Hotel costs
    const hotelCost = (roomsNeeded * selectedRoom.baseRate * nights) + (extraBedsNeeded * selectedRoom.extraBedRate * nights);

    // Tours costs
    const toursCost = selectedTours.reduce((total, tour) => {
      const tourPax = paxDetails.adults + paxDetails.cwb + paxDetails.cnb;
      return total + (tour.costPerPerson * tourPax);
    }, 0);

    // Inclusions costs
    const inclusionsCost = selectedInclusions.reduce((total, inclusion) => {
      const inclusionPax = paxDetails.adults + paxDetails.cwb + paxDetails.cnb + paxDetails.infants;
      return total + (inclusion.cost * inclusionPax);
    }, 0);

    const totalCostAED = hotelCost + toursCost + inclusionsCost;
    const exchangeRate = 3.67; // AED to USD
    const totalCostUSD = totalCostAED / exchangeRate;

    return {
      hotelCost,
      toursCost,
      inclusionsCost,
      totalCostAED,
      totalCostUSD,
      exchangeRate,
      nights,
      roomsNeeded,
      extraBedsNeeded
    };
  };

  const calculations = calculateQuote();

  const updatePax = (type: keyof PaxDetails, increment: boolean) => {
    setPaxDetails(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (increment ? 1 : -1))
    }));
  };

  const toggleTour = (tourId: string) => {
    setSelectedTourIds(prev => 
      prev.includes(tourId) 
        ? prev.filter(id => id !== tourId)
        : [...prev, tourId]
    );
  };

  const toggleInclusion = (inclusionId: string) => {
    setSelectedInclusionIds(prev => 
      prev.includes(inclusionId) 
        ? prev.filter(id => id !== inclusionId)
        : [...prev, inclusionId]
    );
  };

  const saveQuote = () => {
    if (!selectedHotel || !selectedRoom || !calculations || !customerName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const quote: Quote = {
      id: Date.now().toString(),
      ticketReference: `DXB${Date.now()}`,
      customerName,
      customerEmail: customerEmail || undefined,
      travelDates,
      paxDetails,
      selectedHotel,
      selectedRoom,
      selectedTours,
      selectedInclusions,
      calculations,
      status: 'draft',
      createdBy: state.user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_QUOTE', payload: quote });
    dispatch({ type: 'SET_CURRENT_QUOTE', payload: quote });

    toast({
      title: "Quote Saved",
      description: `Quote ${quote.ticketReference} has been saved successfully`,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calculator className="mr-3 h-8 w-8 text-dubai-gold" />
            Dubai Quote Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate professional travel quotes for your clients
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button className="dubai-button-primary flex items-center" onClick={saveQuote}>
            <Download className="mr-2 h-4 w-4" />
            Generate Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card className="dubai-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-dubai-blue" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="dubai-input"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email Address</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="dubai-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Details */}
          <Card className="dubai-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-dubai-blue" />
                Travel Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Check-in Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={travelDates.startDate}
                    onChange={(e) => setTravelDates(prev => ({ ...prev, startDate: e.target.value }))}
                    className="dubai-input"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Check-out Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={travelDates.endDate}
                    onChange={(e) => setTravelDates(prev => ({ ...prev, endDate: e.target.value }))}
                    className="dubai-input"
                  />
                </div>
              </div>

              {/* Pax Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'adults', label: 'Adults' },
                  { key: 'cwb', label: 'Child (with bed)' },
                  { key: 'cnb', label: 'Child (no bed)' },
                  { key: 'infants', label: 'Infants' }
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updatePax(key as keyof PaxDetails, false)}
                        disabled={paxDetails[key as keyof PaxDetails] === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {paxDetails[key as keyof PaxDetails]}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updatePax(key as keyof PaxDetails, true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hotel Selection */}
          <Card className="dubai-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-dubai-blue" />
                Hotel Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hotel">Select Hotel</Label>
                <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                  <SelectTrigger className="dubai-input">
                    <SelectValue placeholder="Choose a hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{hotel.name}</span>
                          <Badge variant="outline">{hotel.starRating}★</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedHotel && (
                <div>
                  <Label htmlFor="room">Select Room Type</Label>
                  <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <SelectTrigger className="dubai-input">
                      <SelectValue placeholder="Choose a room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedHotel.rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{room.type}</span>
                            <span className="text-sm text-muted-foreground">
                              AED {room.baseRate}/night
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tours Selection */}
          <Card className="dubai-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-dubai-blue" />
                Tours & Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-smooth ${
                      selectedTourIds.includes(tour.id)
                        ? 'border-dubai-gold bg-dubai-cream'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleTour(tour.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{tour.name}</h4>
                      <Badge variant={tour.type === 'private' ? 'default' : 'secondary'}>
                        {tour.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{tour.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{tour.duration}</span>
                      <span className="font-semibold text-dubai-navy">AED {tour.costPerPerson}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote Summary */}
        <div className="space-y-6">
          <Card className="dubai-card sticky top-6">
            <CardHeader>
              <CardTitle className="text-dubai-navy">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculations ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Hotel ({calculations.nights} nights)</span>
                      <span>AED {calculations.hotelCost.toLocaleString()}</span>
                    </div>
                    
                    {selectedTours.length > 0 && (
                      <div className="flex justify-between">
                        <span>Tours & Activities</span>
                        <span>AED {calculations.toursCost.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {selectedInclusions.length > 0 && (
                      <div className="flex justify-between">
                        <span>Inclusions</span>
                        <span>AED {calculations.inclusionsCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold text-dubai-navy">
                      <span>Total (AED)</span>
                      <span>AED {calculations.totalCostAED.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total (USD)</span>
                      <span>USD {calculations.totalCostUSD.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Rooms needed: {calculations.roomsNeeded}</p>
                    <p>• Extra beds: {calculations.extraBedsNeeded}</p>
                    <p>• Exchange rate: 1 USD = {calculations.exchangeRate} AED</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select hotel and travel dates to see pricing
                </p>
              )}
            </CardContent>
          </Card>

          {/* Selected Tours */}
          {selectedTours.length > 0 && (
            <Card className="dubai-card">
              <CardHeader>
                <CardTitle className="text-sm">Selected Tours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedTours.map((tour) => (
                    <div key={tour.id} className="flex items-center justify-between text-sm">
                      <span>{tour.name}</span>
                      <span>AED {tour.costPerPerson}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteTool;