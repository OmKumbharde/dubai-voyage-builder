import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../hooks/use-toast';
import { 
  Calculator, 
  Copy, 
  Download, 
  Save, 
  Plus, 
  Minus, 
  Search, 
  MapPin,
  FileText,
  Hotel,
  Building2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../integrations/supabase/client';

// Constants
const AED_TO_USD = 3.65;

type AccommodationType = 'hotel' | 'apartment';
type ApartmentType = '01BR' | '02BR' | '03BR';

const QuoteTool = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotels, tours, inclusions } = useSupabaseData();

  // Core booking details
  const [customerName, setCustomerName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  
  // Pax details
  const [adults, setAdults] = useState(2);
  const [infants, setInfants] = useState(0);
  const [cnb, setCnb] = useState(0);
  const [cwb, setCwb] = useState(0);
  
  // Accommodation type
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('hotel');
  const [apartmentType, setApartmentType] = useState<ApartmentType>('01BR');
  const [selectedOccupancies, setSelectedOccupancies] = useState<string[]>(['DBL']);
  
  // Selections
  const [selectedHotels, setSelectedHotels] = useState<any[]>([]);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  const [editableRates, setEditableRates] = useState<{[key: string]: number}>({});
  
  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [inclusionSearch, setInclusionSearch] = useState('');
  
  // Visa and transfer
  const [includeVisa, setIncludeVisa] = useState(true);
  const [includeAirportTransfer, setIncludeAirportTransfer] = useState(true);
  const [manualAirportTransfer, setManualAirportTransfer] = useState<number | null>(null);
  
  // Generated quote
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<any>(null);

  const totalPax = adults + cnb + cwb;

  const occupancyTypes = [
    { id: 'SGL', label: 'Single', description: '1 person/room' },
    { id: 'DBL', label: 'Double', description: '2 people/room' },
    { id: 'TPL', label: 'Triple', description: '3 people/room' },
  ];

  // Get visa cost from inclusions or fallback
  const getVisaCost = (type: 'adult' | 'child') => {
    const visaInclusion = inclusions.find(inc => 
      inc.type === 'visa' && inc.name.toLowerCase().includes(type)
    );
    return visaInclusion?.cost || (type === 'adult' ? 310 : 73);
  };

  // Get airport transfer cost
  const getAirportTransferCost = () => {
    if (manualAirportTransfer !== null) return manualAirportTransfer;
    
    const paxForTransfer = adults + cnb + cwb;
    if (paxForTransfer <= 5) return 250;
    if (paxForTransfer <= 10) return 500;
    if (paxForTransfer <= 17) return 1000;
    return 0;
  };

  // Calculate tours cost per person
  const calcToursTotalPerPersonAED = () => {
    return selectedTours.reduce((total, tour) => {
      const rateKey = `tour_${tour.id}`;
      const baseRate = editableRates[rateKey] ?? tour.costPerPerson;
      
      let transferCost = 0;
      if (tour.type === 'private' && tour.privateTransferCost) {
        transferCost = tour.privateTransferCost / totalPax;
      }
      
      return total + baseRate + transferCost;
    }, 0);
  };

  // Calculate visa cost
  const calcVisaCostAED = () => {
    if (!includeVisa) return 0;
    const adultVisa = getVisaCost('adult');
    const childVisa = getVisaCost('child');
    return (adults * adultVisa) + ((cnb + cwb) * childVisa);
  };

  // Calculate airport transfer
  const calcAirportTransferCostAED = () => {
    if (!includeAirportTransfer) return 0;
    return getAirportTransferCost();
  };

  // Hotel cost per person
  const calcHotelCostPerPersonAED = (rate: number, nights: number, occupancyType: string) => {
    const total = rate * nights;
    let divisor = 1;
    if (occupancyType === 'DBL') divisor = 2;
    else if (occupancyType === 'TPL') divisor = 3;
    return Math.ceil(total / divisor);
  };

  // Total per person for hotel mode
  const calcTotalPerPersonAED = (hotelCostPerPerson: number) => {
    const toursCost = calcToursTotalPerPersonAED();
    const airportTransferTotal = calcAirportTransferCostAED();
    const perPersonTransfer = adults > 0 ? airportTransferTotal / adults : 0;
    
    let total = hotelCostPerPerson + toursCost;
    if (includeVisa) total += getVisaCost('adult');
    if (includeAirportTransfer) total += perPersonTransfer;
    
    return Math.ceil(total);
  };

  // Add/remove handlers
  const addHotel = (hotel: any) => {
    if (!selectedHotels.find(h => h.id === hotel.id)) {
      setSelectedHotels([...selectedHotels, hotel]);
      setEditableRates(prev => ({
        ...prev,
        [`hotel_${hotel.id}`]: hotel.baseRate
      }));
    }
    setHotelSearch('');
  };

  const removeHotel = (hotelId: string) => {
    setSelectedHotels(selectedHotels.filter(h => h.id !== hotelId));
    const newRates = { ...editableRates };
    delete newRates[`hotel_${hotelId}`];
    setEditableRates(newRates);
  };

  const addTour = (tour: any) => {
    if (!selectedTours.find(t => t.id === tour.id)) {
      setSelectedTours([...selectedTours, tour]);
      setEditableRates(prev => ({
        ...prev,
        [`tour_${tour.id}`]: tour.costPerPerson
      }));
    }
    setTourSearch('');
  };

  const removeTour = (tourId: string) => {
    setSelectedTours(selectedTours.filter(t => t.id !== tourId));
    const newRates = { ...editableRates };
    delete newRates[`tour_${tourId}`];
    setEditableRates(newRates);
  };

  const toggleInclusion = (inclusion: any) => {
    if (selectedInclusions.find(i => i.id === inclusion.id)) {
      setSelectedInclusions(selectedInclusions.filter(i => i.id !== inclusion.id));
      const newRates = { ...editableRates };
      delete newRates[`inclusion_${inclusion.id}`];
      setEditableRates(newRates);
    } else {
      setSelectedInclusions([...selectedInclusions, inclusion]);
      setEditableRates(prev => ({
        ...prev,
        [`inclusion_${inclusion.id}`]: inclusion.cost
      }));
    }
  };

  // Generate quote text
  const generateQuoteText = (quote: any) => {
    const { nights, paxDetails, accommodationType } = quote;
    const { adults, cwb, cnb, infants } = paxDetails;
    
    let quoteText = `Dubai Holiday Package\n\n`;
    quoteText += `Customer: ${quote.customerName}\n`;
    if (quote.ticketReference) quoteText += `TKT Reference: ${quote.ticketReference}\n`;
    quoteText += `Travel Dates: ${format(new Date(quote.checkInDate), 'dd MMM yyyy')} to ${format(new Date(quote.checkOutDate), 'dd MMM yyyy')} (${nights} Nights)\n`;
    quoteText += `Passengers: ${adults} Adult${adults > 1 ? 's' : ''}`;
    if (cwb > 0) quoteText += `, ${cwb} Child${cwb > 1 ? 'ren' : ''} with Bed`;
    if (cnb > 0) quoteText += `, ${cnb} Child${cnb > 1 ? 'ren' : ''} without Bed`;
    if (infants > 0) quoteText += `, ${infants} Infant${infants > 1 ? 's' : ''}`;
    quoteText += `\n\n`;
    
    // Inclusions
    quoteText += `INCLUSIONS:\n`;
    if (accommodationType === 'hotel') {
      quoteText += `• Hotel Accommodation (${nights} Nights)\n`;
    } else {
      quoteText += `• Apartment Accommodation (${nights} Nights)\n`;
    }
    if (includeAirportTransfer) {
      quoteText += `• Airport Transfers\n`;
    }
    if (includeVisa) {
      quoteText += `• UAE Visa\n`;
    }
    selectedTours.forEach(tour => {
      quoteText += `• ${tour.name}\n`;
    });
    selectedInclusions.forEach(inc => {
      quoteText += `• ${inc.name}\n`;
    });
    
    // Transfers
    quoteText += `\nTRANSFERS:\n`;
    const hasPrivateTour = selectedTours.some(t => t.type === 'private');
    if (hasPrivateTour) {
      quoteText += `• All transfers on SIC basis except where private tour specified\n`;
    } else {
      quoteText += `• All transfers on SIC basis\n`;
    }
    
    // Taxes
    quoteText += `\nTAXES:\n`;
    quoteText += `• All taxes except Tourism Dirham\n`;
    
    return quoteText;
  };

  // Filter functions
  const filteredHotels = hotelSearch.length > 0 ? hotels.filter(hotel => 
    (hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
    hotel.location.toLowerCase().includes(hotelSearch.toLowerCase())) &&
    !selectedHotels.find(selected => selected.id === hotel.id)
  ) : [];

  const filteredTours = tourSearch.length > 0 ? tours.filter(tour => 
    tour.name.toLowerCase().includes(tourSearch.toLowerCase()) && 
    !selectedTours.find(selected => selected.id === tour.id)
  ) : [];

  const filteredInclusions = inclusionSearch.length > 0 ? inclusions.filter(inclusion => 
    inclusion.name.toLowerCase().includes(inclusionSearch.toLowerCase()) &&
    !selectedInclusions.find(selected => selected.id === inclusion.id)
  ) : [];

  // Calculate quote
  const calculateQuote = () => {
    if ((accommodationType === 'hotel' && selectedHotels.length === 0) || !checkInDate || !checkOutDate || !customerName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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

    if (accommodationType === 'apartment') {
      // Apartment mode calculation
      const apartmentCapacities: Record<ApartmentType, { adults: number, cnb: number, cwb: number }> = {
        '01BR': { adults: 2, cnb: 1, cwb: 1 },
        '02BR': { adults: 4, cnb: 2, cwb: 2 },
        '03BR': { adults: 6, cnb: 3, cwb: 3 }
      };
      
      const capacity = apartmentCapacities[apartmentType];
      const hotelOptions = selectedHotels.map(hotel => {
        const hotelRateKey = `hotel_${hotel.id}`;
        const rate = editableRates[hotelRateKey] ?? hotel.baseRate ?? 0;
        const extraBedRate = hotel.extraBedRate || 0;
        
        const totalApartmentCostAED = rate * nights;
        
        // Calculate CWB distribution
        const cwbsWithoutExtraBed = Math.min(cwb, capacity.cwb);
        const cwbsWithExtraBed = cwb - cwbsWithoutExtraBed;
        
        const perPersonAptCost = totalApartmentCostAED / (adults + cwbsWithoutExtraBed);
        
        // Adult calculation
        const adultToursCost = calcToursTotalPerPersonAED();
        const adultVisaCost = includeVisa ? getVisaCost('adult') : 0;
        const airportTransferTotal = calcAirportTransferCostAED();
        const adultTransferCost = adults > 0 ? airportTransferTotal / adults : 0;
        const adultTotalAED = perPersonAptCost + adultToursCost + adultVisaCost + adultTransferCost;
        const adultTotalUSD = adultTotalAED / AED_TO_USD;
        
        // CWB without extra bed
        const childToursCost = calcToursTotalPerPersonAED();
        const childVisaCost = includeVisa ? getVisaCost('child') : 0;
        const cwbWithoutExtraBedTotalAED = perPersonAptCost + childToursCost + childVisaCost;
        const cwbWithoutExtraBedTotalUSD = cwbWithoutExtraBedTotalAED / AED_TO_USD;
        
        // CWB with extra bed
        const extraBedTotalCost = extraBedRate * nights;
        const cwbWithExtraBedTotalAED = extraBedTotalCost + childToursCost + childVisaCost;
        const cwbWithExtraBedTotalUSD = cwbWithExtraBedTotalAED / AED_TO_USD;
        
        // CNB calculation
        const cnbTotalAED = childToursCost + childVisaCost;
        const cnbTotalUSD = cnbTotalAED / AED_TO_USD;
        
        // Infant calculation (20 USD visa only)
        const infantTotalUSD = 20;
        
        return {
          hotel,
          apartmentType,
          occupancyOptions: [{
            occupancyType: apartmentType,
            adults: {
              count: adults,
              perPersonAED: Math.ceil(adultTotalAED),
              perPersonUSD: Math.ceil(adultTotalUSD),
              totalAED: Math.ceil(adultTotalAED * adults),
              totalUSD: Math.ceil(adultTotalUSD * adults)
            },
            cwbWithoutBed: cwbsWithoutExtraBed > 0 ? {
              count: cwbsWithoutExtraBed,
              perPersonAED: Math.ceil(cwbWithoutExtraBedTotalAED),
              perPersonUSD: Math.ceil(cwbWithoutExtraBedTotalUSD),
              totalAED: Math.ceil(cwbWithoutExtraBedTotalAED * cwbsWithoutExtraBed),
              totalUSD: Math.ceil(cwbWithoutExtraBedTotalUSD * cwbsWithoutExtraBed)
            } : null,
            cwbWithBed: cwbsWithExtraBed > 0 ? {
              count: cwbsWithExtraBed,
              perPersonAED: Math.ceil(cwbWithExtraBedTotalAED),
              perPersonUSD: Math.ceil(cwbWithExtraBedTotalUSD),
              totalAED: Math.ceil(cwbWithExtraBedTotalAED * cwbsWithExtraBed),
              totalUSD: Math.ceil(cwbWithExtraBedTotalUSD * cwbsWithExtraBed)
            } : null,
            cnb: cnb > 0 ? {
              count: cnb,
              perPersonAED: Math.ceil(cnbTotalAED),
              perPersonUSD: Math.ceil(cnbTotalUSD),
              totalAED: Math.ceil(cnbTotalAED * cnb),
              totalUSD: Math.ceil(cnbTotalUSD * cnb)
            } : null,
            infants: infants > 0 ? {
              count: infants,
              perPersonUSD: infantTotalUSD,
              totalUSD: infantTotalUSD * infants
            } : null
          }]
        };
      });
      
      const quote = {
        accommodationType: 'apartment',
        apartmentType,
        customerName,
        ticketReference: referenceNumber,
        checkInDate,
        checkOutDate,
        nights,
        paxDetails: { adults, infants, cnb, cwb },
        selectedHotels,
        selectedTours,
        selectedInclusions,
        hotelOptions,
        includeVisa,
        includeAirportTransfer,
        totalPax,
        quoteText: generateQuoteText({ 
          accommodationType: 'apartment', 
          apartmentType, 
          customerName, 
          ticketReference: referenceNumber, 
          checkInDate, 
          checkOutDate, 
          nights, 
          paxDetails: { adults, infants, cnb, cwb } 
        })
      };
      
      setGeneratedQuote(quote);
      toast({
        title: "Quote Generated",
        description: "Your quote has been calculated successfully"
      });
      return;
    }
    
    // Hotel mode calculation (existing logic but improved)
    const hotelOptions = selectedHotels.map(hotel => {
      const occupancyOptions = selectedOccupancies.map(occupancyType => {
        const hotelRateKey = `hotel_${hotel.id}`;
        const rate = editableRates[hotelRateKey] ?? hotel.baseRate ?? 0;
        const extraBedRate = hotel.extraBedRate || 0;
        
        const hotelCostPerPerson = calcHotelCostPerPersonAED(rate, nights, occupancyType);
        const totalPerPersonAED = calcTotalPerPersonAED(hotelCostPerPerson);
        const totalPerPersonUSD = totalPerPersonAED / AED_TO_USD;
        
        // Special case: double occupancy family
        const isDoubleOccupancyFamily = 
          (adults === cwb && cnb === 0) || 
          (adults === 1 && cwb === 1 && cnb === 0);
        
        let roomsNeeded = 1;
        if (occupancyType === 'SGL') roomsNeeded = adults;
        else if (occupancyType === 'DBL') roomsNeeded = Math.ceil(adults / 2);
        else if (occupancyType === 'TPL') roomsNeeded = Math.ceil(adults / 3);
        
        const extraBeds = cwb;
        const hotelCost = (roomsNeeded * rate + extraBeds * extraBedRate) * nights;
        
        // Calculate CWB cost
        let cwbPerPersonAED = 0;
        let cwbPerPersonUSD = 0;
        if (cwb > 0) {
          const extraBedCostAED = (extraBedRate * nights);
          const toursCost = calcToursTotalPerPersonAED();
          const childVisaCost = includeVisa ? getVisaCost('child') : 0;
          cwbPerPersonAED = Math.ceil(extraBedCostAED + toursCost + childVisaCost);
          cwbPerPersonUSD = Math.ceil(cwbPerPersonAED / AED_TO_USD);
        }
        
        // Calculate CNB cost
        let cnbPerPersonAED = 0;
        let cnbPerPersonUSD = 0;
        if (cnb > 0) {
          const toursCost = calcToursTotalPerPersonAED();
          const childVisaCost = includeVisa ? getVisaCost('child') : 0;
          cnbPerPersonAED = Math.ceil(toursCost + childVisaCost);
          cnbPerPersonUSD = Math.ceil(cnbPerPersonAED / AED_TO_USD);
        }
        
        const totalCostAED = (totalPerPersonAED * adults) + (cwbPerPersonAED * cwb) + (cnbPerPersonAED * cnb);
        const totalCostUSD = totalCostAED / AED_TO_USD;

        return {
          occupancyType,
          roomsNeeded,
          extraBeds,
          hotelCost,
          totalCostAED,
          totalCostUSD,
          perPersonAED: totalPerPersonAED,
          perPersonUSD: Math.ceil(totalPerPersonUSD),
          cwbPerPersonAED,
          cwbPerPersonUSD,
          cnbPerPersonAED,
          cnbPerPersonUSD,
          isDoubleOccupancyFamily
        };
      });
      
      return {
        hotel,
        occupancyOptions
      };
    });

    const quote = {
      accommodationType: 'hotel',
      customerName,
      ticketReference: referenceNumber,
      checkInDate,
      checkOutDate,
      nights,
      paxDetails: { adults, infants, cnb, cwb },
      selectedHotels,
      selectedTours,
      selectedInclusions,
      hotelOptions,
      includeVisa,
      includeAirportTransfer,
      totalPax,
      quoteText: generateQuoteText({ 
        accommodationType: 'hotel', 
        customerName, 
        ticketReference: referenceNumber, 
        checkInDate, 
        checkOutDate, 
        nights, 
        paxDetails: { adults, infants, cnb, cwb } 
      })
    };

    setGeneratedQuote(quote);
    toast({
      title: "Quote Generated",
      description: "Your quote has been calculated successfully"
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Quote Generator
        </h1>
        <p className="text-muted-foreground">Create professional Dubai tour package quotes</p>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Package Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
              <TabsTrigger value="tours">Tours</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Details */}
            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="referenceNumber">TKT Reference</Label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter ticket reference"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkin">Check-in Date *</Label>
                  <Input
                    id="checkin"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="checkout">Check-out Date *</Label>
                  <Input
                    id="checkout"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Pax Details */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  Passenger Details
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Adults</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{adults}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdults(adults + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CWB</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCwb(Math.max(0, cwb - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{cwb}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCwb(cwb + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CNB</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCnb(Math.max(0, cnb - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{cnb}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCnb(cnb + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Infants</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-12 text-center font-semibold">{infants}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfants(infants + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visa & Transfer Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeVisa"
                    checked={includeVisa}
                    onCheckedChange={(checked) => setIncludeVisa(!!checked)}
                  />
                  <Label htmlFor="includeVisa" className="text-sm font-normal cursor-pointer">
                    Include Visa (Adult: AED {getVisaCost('adult')}, Child: AED {getVisaCost('child')})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTransfer"
                    checked={includeAirportTransfer}
                    onCheckedChange={(checked) => setIncludeAirportTransfer(!!checked)}
                  />
                  <Label htmlFor="includeTransfer" className="text-sm font-normal cursor-pointer">
                    Include Airport Transfer (Auto: AED {getAirportTransferCost()})
                  </Label>
                </div>
              </div>
              {includeAirportTransfer && (
                <div>
                  <Label htmlFor="manualTransfer" className="text-sm">Manual Transfer Cost (AED)</Label>
                  <Input
                    id="manualTransfer"
                    type="number"
                    placeholder="Leave empty for auto-calculation"
                    value={manualAirportTransfer || ''}
                    onChange={(e) => setManualAirportTransfer(e.target.value ? Number(e.target.value) : null)}
                    className="w-full md:w-64"
                  />
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Accommodation */}
            <TabsContent value="accommodation" className="space-y-6 mt-6">
              {/* Accommodation Type Toggle */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={accommodationType === 'hotel' ? 'default' : 'outline'}
                  onClick={() => setAccommodationType('hotel')}
                  className="flex-1"
                >
                  <Hotel className="h-4 w-4 mr-2" />
                  Hotel
                </Button>
                <Button
                  type="button"
                  variant={accommodationType === 'apartment' ? 'default' : 'outline'}
                  onClick={() => setAccommodationType('apartment')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Apartment
                </Button>
              </div>

              {/* Hotel Mode - Occupancy Selection */}
              {accommodationType === 'hotel' && (
                <div>
                  <Label className="mb-3 block">Select Occupancy Types *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {occupancyTypes.map(occupancy => (
                      <div 
                        key={occupancy.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
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
                          onCheckedChange={() => {}}
                        />
                        <div>
                          <p className="font-medium text-sm">{occupancy.label}</p>
                          <p className="text-xs text-muted-foreground">{occupancy.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apartment Mode - Type Selection */}
              {accommodationType === 'apartment' && (
                <div>
                  <Label className="mb-3 block">Select Apartment Type *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['01BR', '02BR', '03BR'] as ApartmentType[]).map(type => (
                      <Button
                        key={type}
                        type="button"
                        variant={apartmentType === type ? 'default' : 'outline'}
                        onClick={() => setApartmentType(type)}
                        className="h-auto py-3 flex-col"
                      >
                        <span className="font-bold">{type}</span>
                        <span className="text-xs opacity-80">
                          {type === '01BR' && '2 Adults + 1 CNB + 1 CWB'}
                          {type === '02BR' && '4 Adults + 2 CNB + 2 CWB'}
                          {type === '03BR' && '6 Adults + 3 CNB + 3 CWB'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hotel/Apartment Search */}
              <div>
                <Label htmlFor="hotelSearch">Search {accommodationType === 'hotel' ? 'Hotels' : 'Apartments'} *</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hotelSearch"
                    placeholder={`Search ${accommodationType}...`}
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Selected */}
                {selectedHotels.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected:</p>
                    {selectedHotels.map(hotel => (
                      <div key={hotel.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{hotel.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hotel.location}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              value={editableRates[`hotel_${hotel.id}`] ?? hotel.baseRate}
                              onChange={(e) => setEditableRates(prev => ({
                                ...prev,
                                [`hotel_${hotel.id}`]: Number(e.target.value)
                              }))}
                              className="w-24 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">AED/night</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeHotel(hotel.id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Available */}
                {hotelSearch && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredHotels.map(hotel => (
                      <Card 
                        key={hotel.id} 
                        className="p-3 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => addHotel(hotel)}
                      >
                        <h4 className="font-medium text-sm">{hotel.name}</h4>
                        <p className="text-xs text-muted-foreground">{hotel.location}</p>
                        <p className="text-xs mt-1 font-semibold">AED {hotel.baseRate}/night</p>
                      </Card>
                    ))}
                    {filteredHotels.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Tours */}
            <TabsContent value="tours" className="space-y-6 mt-6">
              <div>
                <Label htmlFor="tourSearch">Search Tours & Activities</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tourSearch"
                    placeholder="Search tours..."
                    value={tourSearch}
                    onChange={(e) => setTourSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Selected Tours */}
                {selectedTours.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected Tours:</p>
                    {selectedTours.map(tour => (
                      <div key={tour.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{tour.name}</p>
                          <p className="text-xs text-muted-foreground">{tour.type}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              value={editableRates[`tour_${tour.id}`] ?? tour.costPerPerson}
                              onChange={(e) => setEditableRates(prev => ({
                                ...prev,
                                [`tour_${tour.id}`]: Number(e.target.value)
                              }))}
                              className="w-24 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">AED/person</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeTour(tour.id)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Available Tours */}
                {tourSearch && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredTours.map(tour => (
                      <Card 
                        key={tour.id} 
                        className="p-3 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => addTour(tour)}
                      >
                        <h4 className="font-medium text-sm">{tour.name}</h4>
                        <p className="text-xs text-muted-foreground">{tour.type}</p>
                        <p className="text-xs mt-1 font-semibold">AED {tour.costPerPerson}/person</p>
                      </Card>
                    ))}
                    {filteredTours.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Additional Services */}
            <TabsContent value="services" className="space-y-6 mt-6">
              <div>
                <Label htmlFor="inclusionSearch">Search Additional Services</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inclusionSearch"
                    placeholder="Search services..."
                    value={inclusionSearch}
                    onChange={(e) => setInclusionSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Selected Services */}
                {selectedInclusions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected Services:</p>
                    {selectedInclusions.map(inclusion => (
                      <div key={inclusion.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{inclusion.name}</p>
                          <p className="text-xs text-muted-foreground">{inclusion.type}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              value={editableRates[`inclusion_${inclusion.id}`] ?? inclusion.cost}
                              onChange={(e) => setEditableRates(prev => ({
                                ...prev,
                                [`inclusion_${inclusion.id}`]: Number(e.target.value)
                              }))}
                              className="w-24 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">AED/person</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleInclusion(inclusion)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Available Services */}
                {inclusionSearch && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredInclusions.map(inclusion => (
                      <Card 
                        key={inclusion.id} 
                        className="p-3 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => toggleInclusion(inclusion)}
                      >
                        <h4 className="font-medium text-sm">{inclusion.name}</h4>
                        <p className="text-xs text-muted-foreground">{inclusion.type}</p>
                        <p className="text-xs mt-1 font-semibold">AED {inclusion.cost}/person</p>
                      </Card>
                    ))}
                    {filteredInclusions.length === 0 && (
                      <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Generate Button */}
          <div className="flex justify-center mt-8">
            <Button 
              onClick={calculateQuote}
              size="lg"
              className="shadow-card hover:shadow-hover transition-shadow"
            >
              <Calculator className="mr-2 h-5 w-5" />
              Generate Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quote Preview */}
      {generatedQuote && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Generated Quote
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const quoteElement = document.getElementById('quote-preview');
                    if (quoteElement) {
                      navigator.clipboard.writeText(quoteElement.innerText);
                      toast({ title: "Copied!", description: "Quote copied to clipboard" });
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const element = document.getElementById('quote-preview');
                    if (element) {
                      html2pdf()
                        .from(element)
                        .set({
                          margin: 1,
                          filename: `quote-${generatedQuote.customerName.replace(/\s+/g, '-')}.pdf`,
                          html2canvas: { scale: 2 },
                          jsPDF: { orientation: 'portrait', unit: 'in', format: 'letter' }
                        })
                        .save();
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  size="sm"
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.from('quotes').insert([{
                        reference_number: `QT-${Date.now()}`,
                        client_name: generatedQuote.customerName,
                        ticket_reference: generatedQuote.ticketReference,
                        travel_dates_from: generatedQuote.checkInDate,
                        travel_dates_to: generatedQuote.checkOutDate,
                        adults: generatedQuote.paxDetails.adults,
                        infants: generatedQuote.paxDetails.infants,
                        cnb: generatedQuote.paxDetails.cnb,
                        cwb: generatedQuote.paxDetails.cwb,
                        total_amount: generatedQuote.accommodationType === 'hotel' 
                          ? generatedQuote.hotelOptions[0]?.occupancyOptions[0]?.totalCostUSD || 0
                          : generatedQuote.hotelOptions[0]?.occupancyOptions[0]?.adults?.totalUSD || 0,
                        currency: 'USD',
                        status: 'draft',
                        formatted_quote: generatedQuote.quoteText
                      }]).select();
                      
                      if (error) throw error;
                      
                      toast({
                        title: "Quote Saved!",
                        description: "Quote has been saved to the database"
                      });
                      
                      navigate('/quote-management');
                    } catch (error) {
                      console.error('Error saving quote:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save quote",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div id="quote-preview" className="bg-background p-8 rounded-lg border space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold text-primary mb-2">Dubai Holiday Package</h2>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(generatedQuote.checkInDate), 'dd MMM yyyy')} - {format(new Date(generatedQuote.checkOutDate), 'dd MMM yyyy')}
                </p>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer Name</p>
                  <p className="font-semibold">{generatedQuote.customerName}</p>
                </div>
                {generatedQuote.ticketReference && (
                  <div>
                    <p className="text-muted-foreground">TKT Reference</p>
                    <p className="font-semibold">{generatedQuote.ticketReference}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-semibold">{generatedQuote.nights} Nights</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Passengers</p>
                  <p className="font-semibold">{generatedQuote.totalPax}</p>
                </div>
              </div>

              {/* Pricing Tables */}
              <div className="space-y-4">
                {generatedQuote.hotelOptions.map((hotelOption: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2">{hotelOption.hotel.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{hotelOption.hotel.location}</p>
                    
                    {generatedQuote.accommodationType === 'hotel' ? (
                      <div className="space-y-4">
                        {hotelOption.occupancyOptions.map((occ: any, occIdx: number) => (
                          <div key={occIdx} className="bg-muted/30 rounded p-4">
                            <h4 className="font-semibold mb-3">
                              {occ.occupancyType === 'SGL' && 'Single Occupancy'}
                              {occ.occupancyType === 'DBL' && 'Double Occupancy'}
                              {occ.occupancyType === 'TPL' && 'Triple Occupancy'}
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Adults ({generatedQuote.paxDetails.adults})</p>
                                <p className="font-bold text-primary">
                                  ${occ.perPersonUSD} x {generatedQuote.paxDetails.adults} = ${occ.perPersonUSD * generatedQuote.paxDetails.adults}
                                </p>
                              </div>
                              
                              {generatedQuote.paxDetails.cwb > 0 && (
                                <div>
                                  <p className="text-muted-foreground">CWB ({generatedQuote.paxDetails.cwb})</p>
                                  <p className="font-bold text-primary">
                                    ${occ.cwbPerPersonUSD} x {generatedQuote.paxDetails.cwb} = ${occ.cwbPerPersonUSD * generatedQuote.paxDetails.cwb}
                                  </p>
                                </div>
                              )}
                              
                              {generatedQuote.paxDetails.cnb > 0 && (
                                <div>
                                  <p className="text-muted-foreground">CNB ({generatedQuote.paxDetails.cnb})</p>
                                  <p className="font-bold text-primary">
                                    ${occ.cnbPerPersonUSD} x {generatedQuote.paxDetails.cnb} = ${occ.cnbPerPersonUSD * generatedQuote.paxDetails.cnb}
                                  </p>
                                </div>
                              )}
                              
                              {generatedQuote.paxDetails.infants > 0 && (
                                <div>
                                  <p className="text-muted-foreground">Infants ({generatedQuote.paxDetails.infants})</p>
                                  <p className="font-bold text-primary">
                                    $20 x {generatedQuote.paxDetails.infants} = ${20 * generatedQuote.paxDetails.infants}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-lg font-bold text-primary">
                                Total: ${Math.ceil(occ.totalCostUSD)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {hotelOption.occupancyOptions.map((apt: any, aptIdx: number) => (
                          <div key={aptIdx} className="bg-muted/30 rounded p-4">
                            <h4 className="font-semibold mb-3">{apt.occupancyType} Apartment</h4>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {apt.adults && (
                                <div>
                                  <p className="text-muted-foreground">Adults ({apt.adults.count})</p>
                                  <p className="font-bold text-primary">
                                    ${apt.adults.perPersonUSD} x {apt.adults.count} = ${apt.adults.totalUSD}
                                  </p>
                                </div>
                              )}
                              
                              {apt.cwbWithoutBed && (
                                <div>
                                  <p className="text-muted-foreground">CWB ({apt.cwbWithoutBed.count})</p>
                                  <p className="font-bold text-primary">
                                    ${apt.cwbWithoutBed.perPersonUSD} x {apt.cwbWithoutBed.count} = ${apt.cwbWithoutBed.totalUSD}
                                  </p>
                                </div>
                              )}
                              
                              {apt.cwbWithBed && (
                                <div>
                                  <p className="text-muted-foreground">CWB + Extra Bed ({apt.cwbWithBed.count})</p>
                                  <p className="font-bold text-primary">
                                    ${apt.cwbWithBed.perPersonUSD} x {apt.cwbWithBed.count} = ${apt.cwbWithBed.totalUSD}
                                  </p>
                                </div>
                              )}
                              
                              {apt.cnb && (
                                <div>
                                  <p className="text-muted-foreground">CNB ({apt.cnb.count})</p>
                                  <p className="font-bold text-primary">
                                    ${apt.cnb.perPersonUSD} x {apt.cnb.count} = ${apt.cnb.totalUSD}
                                  </p>
                                </div>
                              )}
                              
                              {apt.infants && (
                                <div>
                                  <p className="text-muted-foreground">Infants ({apt.infants.count})</p>
                                  <p className="font-bold text-primary">
                                    ${apt.infants.perPersonUSD} x {apt.infants.count} = ${apt.infants.totalUSD}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-lg font-bold text-primary">
                                Total: ${
                                  (apt.adults?.totalUSD || 0) + 
                                  (apt.cwbWithoutBed?.totalUSD || 0) + 
                                  (apt.cwbWithBed?.totalUSD || 0) + 
                                  (apt.cnb?.totalUSD || 0) + 
                                  (apt.infants?.totalUSD || 0)
                                }
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inclusions */}
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Inclusions</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{generatedQuote.accommodationType === 'hotel' ? 'Hotel' : 'Apartment'} Accommodation ({generatedQuote.nights} Nights)</li>
                  {includeAirportTransfer && <li>Airport Transfers</li>}
                  {includeVisa && <li>UAE Visa</li>}
                  {selectedTours.map(tour => (
                    <li key={tour.id}>{tour.name}</li>
                  ))}
                  {selectedInclusions.map(inc => (
                    <li key={inc.id}>{inc.name}</li>
                  ))}
                </ul>
              </div>

              {/* Transfer & Tax Notes */}
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold">Transfers:</p>
                  <p className="text-muted-foreground">
                    {selectedTours.some(t => t.type === 'private')
                      ? 'All transfers on SIC basis except where private tour specified'
                      : 'All transfers on SIC basis'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Taxes:</p>
                  <p className="text-muted-foreground">All taxes except Tourism Dirham</p>
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
