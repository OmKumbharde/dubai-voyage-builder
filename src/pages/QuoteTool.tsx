import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from '../hooks/use-toast';
import { 
  Calculator, 
  Copy, 
  Download, 
  Save, 
  Plus, 
  Minus, 
  Search, 
  MapPin 
} from 'lucide-react';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { useSupabaseData } from '../hooks/useSupabaseData';

const QuoteTool = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotels, tours, inclusions, addQuote, updateQuote } = useSupabaseData();

  // State for form data
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [infants, setInfants] = useState(0);
  const [cnb, setCnb] = useState(0);
  const [cwb, setCwb] = useState(0);
  const [occupancyTypes] = useState(['SGL', 'DBL', 'TPL']);
  
  // Selection states
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  
  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  
  // Generated quote and editing
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<any>(null);

  // Effects for editing
  useEffect(() => {
    if (location.state?.editQuote) {
      const quote = location.state.editQuote;
      setEditingQuote(quote);
      setCustomerName(quote.client_name || '');
      setCustomerEmail(quote.client_email || '');
      setCheckInDate(quote.travel_dates_from || '');
      setCheckOutDate(quote.travel_dates_to || '');
      setAdults(quote.adults || 2);
      setInfants(quote.infants || 0);
      setCnb(quote.cnb || 0);
      setCwb(quote.cwb || 0);
      // Clear the location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Filter functions
  const filteredHotels = hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
    hotel.location.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  const filteredTours = tours.filter(tour => 
    tour.name.toLowerCase().includes(tourSearch.toLowerCase()) && 
    !selectedTours.find(selected => selected.id === tour.id)
  );

  const totalPax = adults + cnb + cwb;

  // Tour management functions
  const addTour = (tour: any) => {
    if (!selectedTours.find(t => t.id === tour.id)) {
      setSelectedTours([...selectedTours, tour]);
    }
  };

  const removeTour = (tourId: string) => {
    setSelectedTours(selectedTours.filter(tour => tour.id !== tourId));
  };

  // Toggle inclusion function
  const toggleInclusion = (inclusion: any) => {
    if (selectedInclusions.find(i => i.id === inclusion.id)) {
      setSelectedInclusions(selectedInclusions.filter(i => i.id !== inclusion.id));
    } else {
      setSelectedInclusions([...selectedInclusions, inclusion]);
    }
  };

  // Calculate quote function with multiple occupancy options
  const calculateQuote = () => {
    if (!selectedHotel || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing Information",
        description: "Please select hotel and dates",
        variant: "destructive"
      });
      return;
    }

    const nights = Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 3600 * 24));
    if (nights <= 0) {
      toast({
        title: "Invalid Dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive"
      });
      return;
    }

    const exchangeRate = 3.67;
    
    // Calculate for each occupancy type
    const occupancyOptions = occupancyTypes.map(occupancyType => {
      let roomsNeeded = 1;
      let extraBeds = 0;
      let hotelRate = selectedHotel.baseRate || 0;
      let extraBedRate = selectedHotel.extraBedRate || 0;

      // Calculate rooms and extra beds based on occupancy type
      if (occupancyType === 'SGL') {
        roomsNeeded = adults;
        extraBeds = cnb > 0 || cwb > 0 ? Math.ceil((cnb + cwb) / 1) : 0;
      } else if (occupancyType === 'DBL') {
        roomsNeeded = Math.ceil(adults / 2);
        extraBeds = cnb > 0 || cwb > 0 ? Math.ceil((cnb + cwb) / 2) : 0;
      } else if (occupancyType === 'TPL') {
        roomsNeeded = Math.ceil(adults / 3);
        extraBeds = cnb > 0 || cwb > 0 ? Math.ceil((cnb + cwb) / 2) : 0;
      }

      const hotelCost = (roomsNeeded * hotelRate + extraBeds * extraBedRate) * nights;
      
      // Tours and inclusions cost (same for all occupancy types)
      const toursCost = selectedTours.reduce((total, tour) => total + (tour.costPerPerson * totalPax), 0);
      const inclusionsCost = selectedInclusions.reduce((total, inclusion) => total + (inclusion.cost * totalPax), 0);
      
      const totalCostAED = hotelCost + toursCost + inclusionsCost;
      const totalCostUSD = totalCostAED / exchangeRate;
      const perPersonAED = totalCostAED / totalPax;
      const perPersonUSD = totalCostUSD / totalPax;

      return {
        occupancyType,
        roomsNeeded,
        extraBeds,
        hotelCost,
        toursCost,
        inclusionsCost,
        totalCostAED,
        totalCostUSD,
        perPersonAED,
        perPersonUSD
      };
    });

    const quote = {
      customerName,
      customerEmail,
      checkInDate,
      checkOutDate,
      nights,
      paxDetails: { adults, infants, cnb, cwb },
      selectedHotel,
      selectedTours,
      selectedInclusions,
      occupancyOptions,
      exchangeRate,
      totalPax
    };

    setGeneratedQuote(quote);
    generateQuoteText(quote);
  };

  // Generate quote text function with table format
  const generateQuoteText = (quote: any) => {
    const { occupancyOptions, paxDetails, nights, totalPax } = quote;
    
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
    const baseRate = selectedHotel.baseRate || 0;
    const extraBedRate = selectedHotel.extraBedRate || 0;
    quoteText += `Base Rate: AED ${baseRate}/night per room\n`;
    if (extraBedRate > 0) {
      quoteText += `Extra Bed Rate: AED ${extraBedRate}/night\n`;
    }
    quoteText += `\n`;

    // Pricing table header
    quoteText += `PRICING TABLE:\n`;
    quoteText += `${'Occupancy'.padEnd(12)} ${'Rooms'.padEnd(8)} ${'Extra Beds'.padEnd(12)} ${'Hotel Cost'.padEnd(15)} ${'Total AED'.padEnd(15)} ${'Total USD'.padEnd(15)} ${'Per Person USD'.padEnd(15)}\n`;
    quoteText += `${'-'.repeat(110)}\n`;

    // Pricing table rows
    occupancyOptions.forEach((option: any) => {
      const occupancy = option.occupancyType.padEnd(12);
      const rooms = option.roomsNeeded.toString().padEnd(8);
      const extraBeds = option.extraBeds.toString().padEnd(12);
      const hotelCost = `AED ${option.hotelCost.toLocaleString()}`.padEnd(15);
      const totalAED = `AED ${option.totalCostAED.toLocaleString()}`.padEnd(15);
      const totalUSD = `USD ${Math.round(option.totalCostUSD).toLocaleString()}`.padEnd(15);
      const perPersonUSD = `USD ${Math.round(option.perPersonUSD)}`.padEnd(15);
      
      quoteText += `${occupancy} ${rooms} ${extraBeds} ${hotelCost} ${totalAED} ${totalUSD} ${perPersonUSD}\n`;
    });
    quoteText += `\n`;

    // Tours
    if (selectedTours.length > 0) {
      quoteText += `TOURS & ACTIVITIES:\n`;
      selectedTours.forEach(tour => {
        const costPerPerson = tour.costPerPerson || 0;
        const tourTotal = costPerPerson * totalPax;
        quoteText += `• ${tour.name}\n`;
        quoteText += `  AED ${costPerPerson}/person × ${totalPax} pax = AED ${tourTotal.toLocaleString()}\n`;
      });
      quoteText += `\n`;
    }

    // Inclusions
    if (selectedInclusions.length > 0) {
      quoteText += `ADDITIONAL SERVICES:\n`;
      selectedInclusions.forEach(inclusion => {
        const inclusionTotal = inclusion.cost * totalPax;
        quoteText += `• ${inclusion.name}\n`;
        quoteText += `  AED ${inclusion.cost}/person × ${totalPax} pax = AED ${inclusionTotal.toLocaleString()}\n`;
      });
      quoteText += `\n`;
    }

    quoteText += `Exchange Rate: 1 USD = ${quote.exchangeRate} AED\n`;
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
    if (!generatedQuote || !generatedQuote.occupancyOptions) return;
    
    let breakdown = `COST BREAKDOWN (DBL Occupancy):\n\n`;
    const dblOption = generatedQuote.occupancyOptions.find((opt: any) => opt.occupancyType === 'DBL') || generatedQuote.occupancyOptions[0];
    if (dblOption) {
      breakdown += `Hotel Cost: AED ${dblOption.hotelCost.toLocaleString()}\n`;
      breakdown += `Tours Cost: AED ${dblOption.toursCost.toLocaleString()}\n`;
      breakdown += `Services Cost: AED ${dblOption.inclusionsCost.toLocaleString()}\n`;
      breakdown += `Total: AED ${dblOption.totalCostAED.toLocaleString()}\n`;
      breakdown += `USD Equivalent: USD ${Math.round(dblOption.totalCostUSD).toLocaleString()}`;
    }

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
      const dblOption = generatedQuote.occupancyOptions.find((opt: any) => opt.occupancyType === 'DBL') || generatedQuote.occupancyOptions[0];
      const quoteData = {
        ticketReference: editingQuote?.reference_number || `QT-${Date.now()}`,
        customerName,
        customerEmail,
        travelDates: {
          startDate: checkInDate,
          endDate: checkOutDate
        },
        paxDetails: { adults, infants, cnb, cwb },
        selectedHotel,
        selectedTours,
        calculations: {
          totalCostAED: dblOption ? dblOption.totalCostAED : 0,
          totalCostUSD: dblOption ? dblOption.totalCostUSD : 0,
          hotelCost: dblOption ? dblOption.hotelCost : 0,
          toursCost: dblOption ? dblOption.toursCost : 0,
          inclusionsCost: dblOption ? dblOption.inclusionsCost : 0
        },
        status: 'draft' as const,
        createdBy: 'system'
      };

      if (editingQuote) {
        await updateQuote(editingQuote.id, quoteData);
        toast({
          title: "Quote Updated",
          description: "Quote has been updated successfully"
        });
      } else {
        await addQuote(quoteData);
        toast({
          title: "Quote Saved",
          description: "Quote has been saved successfully"
        });
      }

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
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {editingQuote ? 'Edit Quote' : 'Quote Generator'}
        </h1>
        <p className="text-muted-foreground">
          {editingQuote ? 'Modify existing quote details' : 'Create professional tour package quotes'}
        </p>
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

          {/* Note about multiple occupancy */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              📋 Multiple Occupancy Options
            </p>
            <p className="text-xs text-blue-600 mt-1">
              The quote will show pricing for Single (SGL), Double (DBL), and Triple (TPL) occupancy options with USD per person rates.
            </p>
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
                  {editingQuote ? 'Update Quote' : 'Save Quote'}
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
            
            {/* Occupancy Options Table */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Pricing Breakdown by Occupancy</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">Occupancy</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Rooms</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Extra Beds</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Hotel Cost</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Total AED</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Total USD</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Per Person USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedQuote.occupancyOptions.map((option: any, index: number) => (
                      <tr key={index} className={index === 1 ? 'bg-blue-50' : ''}>
                        <td className="border border-gray-300 px-4 py-2 font-medium">{option.occupancyType}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{option.roomsNeeded}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{option.extraBeds}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">AED {option.hotelCost.toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">AED {option.totalCostAED.toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-semibold">USD {Math.round(option.totalCostUSD).toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-bold text-blue-600">USD {Math.round(option.perPersonUSD)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">
                  * DBL (Double occupancy) is highlighted as the most common option
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteTool;