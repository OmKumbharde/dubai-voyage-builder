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
import { supabase } from '../integrations/supabase/client';

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
  
  // Occupancy selection state
  const [selectedOccupancies, setSelectedOccupancies] = useState<string[]>(['DBL']);
  const occupancyTypes = [
    { id: 'SGL', label: 'Single Occupancy', description: 'One person per room' },
    { id: 'DBL', label: 'Double Occupancy', description: 'Two people per room' },
    { id: 'TPL', label: 'Triple Occupancy', description: 'Three people per room' },
  ];
  
  // Selection states
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  
  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [inclusionSearch, setInclusionSearch] = useState('');
  
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
      
      // Load existing hotel selection
      if (quote.selectedHotel) {
        const existingHotel = hotels.find(h => h.id === quote.selectedHotel.id);
        if (existingHotel) setSelectedHotel(existingHotel);
      }
      
      // Load existing tours selection
      if (quote.selectedTours && Array.isArray(quote.selectedTours)) {
        const existingTours = quote.selectedTours.map(tourData => 
          tours.find(t => t.id === tourData.id) || tourData
        ).filter(Boolean);
        setSelectedTours(existingTours);
      }
      
      // Load existing inclusions selection
      if (quote.selectedInclusions && Array.isArray(quote.selectedInclusions)) {
        const existingInclusions = quote.selectedInclusions.map(incData => 
          inclusions.find(i => i.id === incData.id) || incData
        ).filter(Boolean);
        setSelectedInclusions(existingInclusions);
      }
      
      // Clear the location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, hotels, tours, inclusions]);

  // Filter functions
  const filteredHotels = hotelSearch.length > 0 ? hotels.filter(hotel => 
    hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
    hotel.location.toLowerCase().includes(hotelSearch.toLowerCase())
  ) : [];

  const filteredTours = tourSearch.length > 0 ? tours.filter(tour => 
    tour.name.toLowerCase().includes(tourSearch.toLowerCase()) && 
    !selectedTours.find(selected => selected.id === tour.id)
  ) : [];

  const filteredInclusions = inclusionSearch.length > 0 ? inclusions.filter(inclusion => 
    inclusion.name.toLowerCase().includes(inclusionSearch.toLowerCase()) &&
    !selectedInclusions.find(selected => selected.id === inclusion.id)
  ) : [];

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
    
    // Calculate for each selected occupancy type
    const occupancyOptions = selectedOccupancies.map(occupancyType => {
      let roomsNeeded = 1;
      let extraBeds = 0;
      let hotelRate = selectedHotel.baseRate || 0;
      let extraBedRate = selectedHotel.extraBedRate || 0;

      // Calculate rooms and extra beds based on occupancy type
      if (occupancyType === 'SGL') {
        roomsNeeded = adults;
        extraBeds = cwb > 0 ? cwb : 0; // Extra bed only for CWB
      } else if (occupancyType === 'DBL') {
        roomsNeeded = Math.ceil(adults / 2);
        extraBeds = cwb > 0 ? cwb : 0; // Extra bed only for CWB
      } else if (occupancyType === 'TPL') {
        roomsNeeded = Math.ceil(adults / 3);
        extraBeds = cwb > 0 ? cwb : 0; // Extra bed only for CWB
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

  // Generate quote text function with document format
  const generateQuoteText = (quote: any) => {
    const { occupancyOptions, paxDetails, nights, totalPax } = quote;
    
    // Main Quote Text - Professional format like the Word document
    let quoteText = `Quote:\n\n`;
    quoteText += `Dear Partner,\n\n`;
    quoteText += `Greetings for the day…!!!\n\n`;
    quoteText += `Pleased to quote you as below :\n\n`;
    quoteText += `Kindly check the rate / hotel availability with us when your client is ready to book\n\n`;
    
    // Pax and dates info
    quoteText += `No of Pax: ${String(paxDetails.adults).padStart(2, '0')} Adults`;
    if (paxDetails.infants > 0) quoteText += `, ${String(paxDetails.infants).padStart(2, '0')} Infants`;
    if (paxDetails.cnb > 0) quoteText += `, ${String(paxDetails.cnb).padStart(2, '0')} CNB`;
    if (paxDetails.cwb > 0) quoteText += `, ${String(paxDetails.cwb).padStart(2, '0')} CWB`;
    quoteText += `\n\n`;
    
    quoteText += `Check-in: ${format(new Date(checkInDate), 'do MMMM yyyy')}\n`;
    quoteText += `Check-out: ${format(new Date(checkOutDate), 'do MMMM yyyy')}\n\n`;

    // Hotel table header
    let headerRow = `Hotel`.padEnd(35);
    if (occupancyOptions.some((opt: any) => opt.occupancyType === 'DBL')) {
      headerRow += ` | Price (Double Occupancy)`.padEnd(25);
    }
    if (occupancyOptions.some((opt: any) => opt.occupancyType === 'SGL')) {
      headerRow += ` | Price (Single Occupancy)`.padEnd(25);
    }
    if (occupancyOptions.some((opt: any) => opt.occupancyType === 'TPL')) {
      headerRow += ` | Price (Triple Occupancy)`.padEnd(25);
    }
    if (cwb > 0) {
      headerRow += ` | Price (Child with Extra Bed)`.padEnd(29);
    }
    
    quoteText += `${headerRow}\n`;
    quoteText += `${'-'.repeat(headerRow.length)}\n`;

    // Hotel row with prices
    let hotelRow = `${selectedHotel.name} ${selectedHotel.starRating}*`.padEnd(35);
    occupancyOptions.forEach((option: any) => {
      const perPersonUSD = Math.round(option.perPersonUSD);
      if (option.occupancyType === 'DBL') {
        hotelRow += ` | USD ${perPersonUSD} per person with BB`.padEnd(25);
      } else if (option.occupancyType === 'SGL') {
        hotelRow += ` | USD ${perPersonUSD} per person with BB`.padEnd(25);
      } else if (option.occupancyType === 'TPL') {
        hotelRow += ` | USD ${perPersonUSD} per person with BB`.padEnd(25);
      }
    });
    if (cwb > 0) {
      const extraBedUSD = Math.round((selectedHotel.extraBedRate * nights) / quote.exchangeRate);
      hotelRow += ` | USD ${extraBedUSD} per person with BB`.padEnd(29);
    }
    
    quoteText += `${hotelRow}\n\n`;

    // Inclusions
    quoteText += `Inclusions:\n\n`;
    quoteText += `- ${String(nights).padStart(2, '0')} Night's accommodation in above specified hotel(s)\n`;
    quoteText += `- Daily Breakfast\n`;
    
    // Add selected tours as inclusions
    selectedTours.forEach(tour => {
      quoteText += `- ${tour.name}\n`;
    });
    
    // Add selected inclusions
    selectedInclusions.forEach(inclusion => {
      quoteText += `- ${inclusion.name}\n`;
    });
    
    quoteText += `- All transfers on a SIC basis\n`;
    quoteText += `- All taxes Including Tourism Dirham\n\n`;
    
    quoteText += `Note: Rates and rooms are subject to change at the time of confirmation. / Rates quoted are fully nonrefundable\n\n`;
    quoteText += `Should you need any clarifications on the above or require further assistance, please feel free to contact me at any time.\n\n`;
    quoteText += `Looking forward to your earliest reply...\n\n`;
    quoteText += `Note: As per the Dubai Executive Council Resolution No. (2) of 2014, a "Tourism Dirham (TD)" charge of AED 10 to AED 20 per room per night (depending on the Hotel Classification category) will apply for hotel rooms and Suites. For Apartments, charges apply.\n`;

    quote.formattedText = quoteText;
    
    // Generate breakdown
    quote.breakdown = generateBreakdown(quote);
    
    setGeneratedQuote(quote);
  };

  // Generate breakdown text
  const generateBreakdown = (quote: any) => {
    const { occupancyOptions, selectedTours, selectedInclusions, totalPax, nights } = quote;
    
    let breakdown = `Breakdown:\n\n`;
    breakdown += `${format(new Date(checkInDate), 'dd MMM')} - ${format(new Date(checkOutDate), 'dd MMM')}\n\n`;
    breakdown += `${String(nights).padStart(2, '0')} Nights\n\n`;
    breakdown += `${totalPax} Adults\n\n`;

    // Hotel costs for each occupancy
    occupancyOptions.forEach((option: any, index: number) => {
      const hotelCostUSD = Math.round(option.hotelCost / quote.exchangeRate);
      breakdown += `${selectedHotel.name} ${option.occupancyType} | ${hotelCostUSD} sell\n`;
    });
    
    // Tours total
    if (selectedTours.length > 0) {
      const toursTotal = selectedTours.reduce((total: number, tour: any) => total + (tour.costPerPerson * totalPax), 0);
      const toursTotalUSD = Math.round(toursTotal / quote.exchangeRate);
      breakdown += `Trio Tour | ${toursTotalUSD}\n`;
    }
    
    // Inclusions total
    if (selectedInclusions.length > 0) {
      selectedInclusions.forEach((inclusion: any) => {
        const inclusionTotalUSD = Math.round((inclusion.cost * totalPax) / quote.exchangeRate);
        breakdown += `${inclusion.name} | ${inclusionTotalUSD}\n`;
      });
    }
    
    // Total for double occupancy (default)
    const dblOption = occupancyOptions.find((opt: any) => opt.occupancyType === 'DBL') || occupancyOptions[0];
    const totalUSD = Math.round(dblOption.totalCostUSD);
    breakdown += `Total | ${totalUSD}\n`;

    return breakdown;
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
          exchangeRate: generatedQuote.exchangeRate || 3.67
        },
        status: 'draft' as const,
        createdBy: 'system'
      };

      if (editingQuote) {
        // Use database field names directly
        const updateData = {
          reference_number: editingQuote.reference_number,
          client_name: customerName,
          client_email: customerEmail,
          travel_dates_from: checkInDate,
          travel_dates_to: checkOutDate,
          adults,
          infants,
          cnb,
          cwb,
          total_amount: dblOption ? dblOption.totalCostAED : 0,
          currency: 'AED',
          status: 'draft',
          formatted_quote: generatedQuote.formattedText,
          notes: generatedQuote.breakdown
        };
        
        const { error } = await supabase
          .from('quotes')
          .update(updateData)
          .eq('id', editingQuote.id);
          
        if (error) throw error;
        toast({
          title: "Quote Updated",
          description: "Quote has been updated successfully"
        });
      } else {
        // Use database field names directly  
        const insertData = {
          reference_number: `QT-${Date.now()}`,
          client_name: customerName,
          client_email: customerEmail,
          travel_dates_from: checkInDate,
          travel_dates_to: checkOutDate,
          adults,
          infants,
          cnb,
          cwb,
          total_amount: dblOption ? dblOption.totalCostAED : 0,
          currency: 'AED',
          status: 'draft',
          formatted_quote: generatedQuote.formattedText,
          notes: generatedQuote.breakdown
        };
        
        const { error } = await supabase
          .from('quotes')
          .insert([insertData]);
          
        if (error) throw error;
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

          {/* Occupancy Selection */}
          <div>
            <Label>Select Occupancy Types to Display *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose which occupancy types to show in the quote table
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {occupancyTypes.map(occupancy => (
                <div 
                  key={occupancy.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (selectedOccupancies.includes(occupancy.id)) {
                      setSelectedOccupancies(selectedOccupancies.filter(o => o !== occupancy.id));
                    } else {
                      setSelectedOccupancies([...selectedOccupancies, occupancy.id]);
                    }
                  }}
                >
                  <Checkbox 
                    checked={selectedOccupancies.includes(occupancy.id)}
                    onChange={() => {}}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{occupancy.label}</p>
                    <p className="text-xs text-muted-foreground">{occupancy.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note about multiple occupancy */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              📋 Quote Format
            </p>
            <p className="text-xs text-blue-600 mt-1">
              The quote will show pricing for selected occupancy types with USD per person rates in a professional format.
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
                  {hotelSearch.length > 0 && filteredHotels.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                      No hotels found matching your search.
                    </p>
                  )}
                  {hotelSearch.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                      Start typing to search for hotels...
                    </p>
                  )}
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
                {tourSearch.length > 0 && filteredTours.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    No tours found matching your search.
                  </p>
                )}
                {tourSearch.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    Start typing to search for tours...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Inclusions Selection */}
          <div>
            <Label>Additional Services</Label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search additional services..."
                  value={inclusionSearch}
                  onChange={(e) => setInclusionSearch(e.target.value)}
                  className="dubai-input pl-10"
                />
              </div>
              
              {/* Selected Inclusions */}
              {selectedInclusions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Services:</p>
                  {selectedInclusions.map(inclusion => (
                    <div key={inclusion.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{inclusion.name}</span>
                        <p className="text-sm text-muted-foreground">
                          AED {inclusion.cost}/person × {totalPax} pax = AED {(inclusion.cost * totalPax).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleInclusion(inclusion)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Available Inclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {filteredInclusions.map(inclusion => (
                  <div 
                    key={inclusion.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleInclusion(inclusion)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{inclusion.name}</p>
                      <p className="text-xs text-muted-foreground">
                        AED {inclusion.cost}/person × {totalPax} pax = AED {(inclusion.cost * totalPax).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {inclusionSearch.length > 0 && filteredInclusions.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    No services found matching your search.
                  </p>
                )}
                {inclusionSearch.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                    Start typing to search for additional services...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Generate Quote Button */}
          <div className="flex justify-center">
            <Button 
              onClick={calculateQuote}
              className="dubai-button-primary"
              disabled={!selectedHotel || !customerName || !checkInDate || !checkOutDate || selectedOccupancies.length === 0}
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
            {/* Quote Display */}
            <div id="quote-content" className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="space-y-6">
                {/* Main Quote Text */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-800">
                    {generatedQuote.formattedText}
                  </pre>
                </div>
                
                {/* Breakdown Section */}
                {generatedQuote.breakdown && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Breakdown:</h3>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-800">
                        {generatedQuote.breakdown}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Detailed Pricing Table for Reference */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Detailed Pricing (All Occupancy Types)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 text-left">Occupancy</th>
                          <th className="border border-gray-300 px-3 py-2 text-center">Rooms</th>
                          {cwb > 0 && <th className="border border-gray-300 px-3 py-2 text-center">Extra Beds</th>}
                          <th className="border border-gray-300 px-3 py-2 text-right">Hotel Cost (AED)</th>
                          <th className="border border-gray-300 px-3 py-2 text-right">Total AED</th>
                          <th className="border border-gray-300 px-3 py-2 text-right">Total USD</th>
                          <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Per Person USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedQuote.occupancyOptions.map((option: any, index: number) => (
                          <tr key={index} className={option.occupancyType === 'DBL' ? 'bg-blue-50' : 'bg-white'}>
                            <td className="border border-gray-300 px-3 py-2 font-medium">
                              {option.occupancyType} 
                              {option.occupancyType === 'DBL' && ' (Recommended)'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{option.roomsNeeded}</td>
                            {cwb > 0 && <td className="border border-gray-300 px-3 py-2 text-center">{option.extraBeds}</td>}
                            <td className="border border-gray-300 px-3 py-2 text-right">AED {option.hotelCost.toLocaleString()}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">AED {option.totalCostAED.toLocaleString()}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">USD {Math.round(option.totalCostUSD).toLocaleString()}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-600">
                              USD {Math.round(option.perPersonUSD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    * Double occupancy (DBL) is highlighted as the most commonly selected option
                  </p>
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