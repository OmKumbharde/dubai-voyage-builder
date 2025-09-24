import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  CalendarIcon, 
  Users, 
  Building2, 
  MapPin, 
  Copy, 
  Download, 
  Save,
  Calculator,
  Search,
  Plus,
  Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { toast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';

const QuoteTool = () => {
  const { hotels, tours, inclusions, addQuote } = useSupabaseData();
  const navigate = useNavigate();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [infants, setInfants] = useState(0);
  const [cnb, setCnb] = useState(0);
  const [cwb, setCwb] = useState(0);
  const [occupancyType, setOccupancyType] = useState('DBL');
  const [accomType, setAccomType] = useState('hotel');
  
  // Selected items
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  
  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  
  // Generated quote
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);

  // Filter functions
  const filteredHotels = hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
    hotel.location.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  const filteredTours = tours.filter(tour => 
    tour.name.toLowerCase().includes(tourSearch.toLowerCase())
  );

  // Calculate nights
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate total pax
  const totalPax = adults + cnb + cwb;

  // Add tour function
  const addTour = (tour: any) => {
    if (!selectedTours.find(t => t.id === tour.id)) {
      setSelectedTours([...selectedTours, tour]);
    }
  };

  // Remove tour function
  const removeTour = (tourId: string) => {
    setSelectedTours(selectedTours.filter(t => t.id !== tourId));
  };

  // Toggle inclusion function
  const toggleInclusion = (inclusion: any) => {
    if (selectedInclusions.find(i => i.id === inclusion.id)) {
      setSelectedInclusions(selectedInclusions.filter(i => i.id !== inclusion.id));
    } else {
      setSelectedInclusions([...selectedInclusions, inclusion]);
    }
  };

  // Calculate quote function (using the exact logic from original App.js)
  const calculateQuote = () => {
    if (!selectedHotel || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing Information",
        description: "Please select hotel and dates",
        variant: "destructive"
      });
      return;
    }

    const nights = calculateNights();
    if (nights <= 0) {
      toast({
        title: "Invalid Dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive"
      });
      return;
    }

    // Hotel calculation logic from original App.js
    let hotelRate = selectedHotel.baseRate;
    let extraBedRate = selectedHotel.extraBedRate || 0;
    
    // Occupancy type logic
    let roomsNeeded = 1;
    let extraBeds = 0;

    if (occupancyType === 'SGL') {
      roomsNeeded = adults;
    } else if (occupancyType === 'DBL') {
      roomsNeeded = Math.ceil(adults / 2);
    } else if (occupancyType === 'TPL') {
      roomsNeeded = Math.ceil(adults / 3);
    } else if (occupancyType === 'QUAD') {
      roomsNeeded = Math.ceil(adults / 4);
    }

    // Add extra beds for children with bed
    extraBeds = cwb;

    const hotelCost = (roomsNeeded * hotelRate * nights) + (extraBeds * extraBedRate * nights);

    // Tours calculation
    const toursCost = selectedTours.reduce((total, tour) => {
      return total + (tour.costPerPerson * totalPax);
    }, 0);

    // Inclusions calculation
    const inclusionsCost = selectedInclusions.reduce((total, inclusion) => {
      return total + (inclusion.cost * totalPax);
    }, 0);

    const totalCostAED = hotelCost + toursCost + inclusionsCost;
    const exchangeRate = 3.67;
    const totalCostUSD = totalCostAED / exchangeRate;

    // Generate formatted quote text (matching original App.js format)
    const quote = {
      customerName,
      customerEmail,
      checkInDate,
      checkOutDate,
      nights,
      paxDetails: { adults, infants, cnb, cwb },
      occupancyType,
      selectedHotel,
      selectedTours,
      selectedInclusions,
      calculations: {
        hotelCost,
        toursCost,
        inclusionsCost,
        totalCostAED,
        totalCostUSD,
        exchangeRate,
        roomsNeeded,
        extraBeds
      }
    };

    setGeneratedQuote(quote);
    generateQuoteText(quote);
  };

  // Generate quote text function
  const generateQuoteText = (quote: any) => {
    const { calculations, paxDetails, nights } = quote;
    
    let quoteText = `DUBAI TOUR PACKAGE QUOTE\n\n`;
    quoteText += `Customer: ${customerName}\n`;
    if (customerEmail) quoteText += `Email: ${customerEmail}\n`;
    quoteText += `Travel Dates: ${format(new Date(checkInDate), 'dd MMM yyyy')} - ${format(new Date(checkOutDate), 'dd MMM yyyy')} (${nights} nights)\n`;
    quoteText += `Pax: ${paxDetails.adults} Adults`;
    if (paxDetails.infants > 0) quoteText += `, ${paxDetails.infants} Infants`;
    if (paxDetails.cnb > 0) quoteText += `, ${paxDetails.cnb} CNB`;
    if (paxDetails.cwb > 0) quoteText += `, ${paxDetails.cwb} CWB`;
    quoteText += `\n\n`;

    // Hotel details
    quoteText += `ACCOMMODATION:\n`;
    quoteText += `${selectedHotel.name} - ${selectedHotel.location}\n`;
    quoteText += `${occupancyType} occupancy (${calculations.roomsNeeded} room${calculations.roomsNeeded > 1 ? 's' : ''}`;
    if (calculations.extraBeds > 0) quoteText += ` + ${calculations.extraBeds} extra bed${calculations.extraBeds > 1 ? 's' : ''}`;
    quoteText += `)\n`;
    quoteText += `Cost: AED ${calculations.hotelCost.toLocaleString()}\n\n`;

    // Tours
    if (selectedTours.length > 0) {
      quoteText += `TOURS & ACTIVITIES:\n`;
      selectedTours.forEach(tour => {
        quoteText += `• ${tour.name} - AED ${(tour.costPerPerson * (adults + cnb + cwb)).toLocaleString()}\n`;
      });
      quoteText += `Total Tours Cost: AED ${calculations.toursCost.toLocaleString()}\n\n`;
    }

    // Inclusions
    if (selectedInclusions.length > 0) {
      quoteText += `ADDITIONAL SERVICES:\n`;
      selectedInclusions.forEach(inclusion => {
        quoteText += `• ${inclusion.name} - AED ${(inclusion.cost * (adults + cnb + cwb)).toLocaleString()}\n`;
      });
      quoteText += `Total Services Cost: AED ${calculations.inclusionsCost.toLocaleString()}\n\n`;
    }

    quoteText += `TOTAL PACKAGE COST:\n`;
    quoteText += `AED ${calculations.totalCostAED.toLocaleString()} (USD ${calculations.totalCostUSD.toLocaleString()})\n\n`;
    quoteText += `Note: All prices are subject to availability and confirmation.\n`;

    quote.formattedText = quoteText;
    setGeneratedQuote(quote);
  };

  // Copy formatted text
  const copyFormattedText = () => {
    if (generatedQuote?.formattedText) {
      navigator.clipboard.writeText(generatedQuote.formattedText);
      toast({ title: "Copied!", description: "Quote text copied to clipboard" });
    }
  };

  // Copy breakdown
  const copyBreakdown = () => {
    if (!generatedQuote) return;
    
    const { calculations } = generatedQuote;
    let breakdown = `COST BREAKDOWN:\n\n`;
    breakdown += `Hotel Cost: AED ${calculations.hotelCost.toLocaleString()}\n`;
    breakdown += `Tours Cost: AED ${calculations.toursCost.toLocaleString()}\n`;
    breakdown += `Services Cost: AED ${calculations.inclusionsCost.toLocaleString()}\n`;
    breakdown += `Total: AED ${calculations.totalCostAED.toLocaleString()}\n`;
    breakdown += `USD Equivalent: USD ${calculations.totalCostUSD.toLocaleString()}`;

    navigator.clipboard.writeText(breakdown);
    toast({ title: "Copied!", description: "Breakdown copied to clipboard" });
  };

  // Download PDF
  const downloadPDF = () => {
    if (!generatedQuote) return;

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #b8860b; text-align: center; margin-bottom: 30px;">DUBAI TOUR PACKAGE QUOTE</h1>
        <div style="white-space: pre-line; font-size: 14px;">${generatedQuote.formattedText}</div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `quote-${customerName || 'customer'}-${Date.now()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Save quote
  const saveQuote = async () => {
    if (!generatedQuote) {
      toast({
        title: "No Quote Generated",
        description: "Please generate a quote first",
        variant: "destructive"
      });
      return;
    }

    try {
      const quoteData = {
        ticketReference: `QT-${Date.now()}`,
        customerName,
        customerEmail,
        travelDates: {
          startDate: checkInDate,
          endDate: checkOutDate
        },
        paxDetails: {
          adults,
          infants,
          cnb,
          cwb
        },
        selectedHotel,
        selectedTours,
        calculations: generatedQuote.calculations,
        status: 'draft' as const,
        createdBy: 'system'
      };

      await addQuote(quoteData);
      
      toast({
        title: "Quote Saved",
        description: "Quote has been saved successfully"
      });

      // Navigate to quotes management
      navigate('/quotes');
    } catch (error) {
      toast({
        title: "Error Saving Quote",
        description: "Failed to save quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">Quote Generator</h1>
        <p className="text-muted-foreground">Create professional tour package quotes</p>
      </div>

      {/* Input Form */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Package Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Details */}
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
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter customer email"
                className="dubai-input"
              />
            </div>
          </div>

          {/* Travel Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkin">Check-in Date *</Label>
              <Input
                id="checkin"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="dubai-input"
              />
            </div>
            <div>
              <Label htmlFor="checkout">Check-out Date *</Label>
              <Input
                id="checkout"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="dubai-input"
              />
            </div>
          </div>

          {/* Pax Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="adults">Adults *</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[40px] text-center font-medium">{adults}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdults(adults + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="infants">Infants</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInfants(Math.max(0, infants - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[40px] text-center font-medium">{infants}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInfants(infants + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="cnb">CNB</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCnb(Math.max(0, cnb - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[40px] text-center font-medium">{cnb}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCnb(cnb + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="cwb">CWB</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCwb(Math.max(0, cwb - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[40px] text-center font-medium">{cwb}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCwb(cwb + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Occupancy Type */}
          <div>
            <Label>Occupancy Type</Label>
            <Select value={occupancyType} onValueChange={setOccupancyType}>
              <SelectTrigger className="dubai-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SGL">Single (SGL)</SelectItem>
                <SelectItem value="DBL">Double (DBL)</SelectItem>
                <SelectItem value="TPL">Triple (TPL)</SelectItem>
                <SelectItem value="QUAD">Quad (QUAD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hotel Selection */}
          <div>
            <Label htmlFor="hotelSearch">Select Hotel *</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hotelSearch"
                  placeholder="Search hotels..."
                  value={hotelSearch}
                  onChange={(e) => setHotelSearch(e.target.value)}
                  className="dubai-input pl-10"
                />
              </div>
              
              {selectedHotel ? (
                <Card className="p-4 border-dubai-gold">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{selectedHotel.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedHotel.location}
                      </p>
                      <p className="text-sm mt-1">
                        Base Rate: AED {selectedHotel.baseRate}/night
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Extra Bed: AED {selectedHotel.extraBedRate}/night
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedHotel(null)}
                    >
                      Change
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {filteredHotels.map(hotel => (
                    <Card 
                      key={hotel.id} 
                      className="p-3 cursor-pointer hover:border-dubai-gold transition-colors"
                      onClick={() => {
                        setSelectedHotel(hotel);
                        setHotelSearch('');
                      }}
                    >
                      <h4 className="font-medium text-sm">{hotel.name}</h4>
                      <p className="text-xs text-muted-foreground">{hotel.location}</p>
                      <p className="text-xs mt-1">AED {hotel.baseRate}/night</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tours Selection */}
          <div>
            <Label>Select Tours & Activities</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tours..."
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  className="dubai-input pl-10"
                />
              </div>
              
              {/* Selected Tours */}
              {selectedTours.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Tours:</p>
                  {selectedTours.map(tour => (
                    <div key={tour.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{tour.name}</span>
                        <p className="text-sm text-muted-foreground">
                          AED {tour.costPerPerson}/person × {totalPax} pax = AED {(tour.costPerPerson * totalPax).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTour(tour.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Available Tours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {filteredTours.map(tour => (
                  <Card 
                    key={tour.id} 
                    className="p-3 cursor-pointer hover:border-dubai-gold transition-colors"
                    onClick={() => addTour(tour)}
                  >
                    <h4 className="font-medium text-sm">{tour.name}</h4>
                    <p className="text-xs text-muted-foreground">{tour.type}</p>
                    <p className="text-xs mt-1">AED {tour.costPerPerson}/person</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Inclusions Selection */}
          <div>
            <Label>Additional Services</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inclusions.map(inclusion => (
                <div 
                  key={inclusion.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleInclusion(inclusion)}
                >
                  <Checkbox 
                    checked={selectedInclusions.some(i => i.id === inclusion.id)}
                    onChange={() => toggleInclusion(inclusion)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{inclusion.name}</p>
                    <p className="text-xs text-muted-foreground">
                      AED {inclusion.cost}/person × {totalPax} pax = AED {(inclusion.cost * totalPax).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Quote Button */}
          <div className="flex justify-center">
            <Button 
              onClick={calculateQuote}
              className="dubai-button-primary"
              disabled={!selectedHotel || !customerName || !checkInDate || !checkOutDate}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Generate Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Quote */}
      {generatedQuote && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Quote</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyFormattedText}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
                <Button variant="outline" size="sm" onClick={copyBreakdown}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Breakdown
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={saveQuote} className="dubai-button-primary">
                  <Save className="h-4 w-4 mr-2" />
                  Save Quote
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-6 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {generatedQuote.formattedText}
              </pre>
            </div>
            
            {/* Cost Summary */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  AED {generatedQuote.calculations.hotelCost.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Hotel Cost</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  AED {generatedQuote.calculations.toursCost.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tours Cost</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  AED {generatedQuote.calculations.inclusionsCost.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Services Cost</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  AED {generatedQuote.calculations.totalCostAED.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-xs text-muted-foreground">
                  USD {generatedQuote.calculations.totalCostUSD.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteTool;