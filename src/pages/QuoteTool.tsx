import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../hooks/use-toast';
import { cn } from '../lib/utils';
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
  Users,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { supabase } from '../integrations/supabase/client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuoteTool = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotels, tours, inclusions, addQuote, updateQuote } = useSupabaseData();

  // State for form data
  const [customerName, setCustomerName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
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
  const [selectedHotels, setSelectedHotels] = useState<any[]>([]);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  const [editableRates, setEditableRates] = useState<{[key: string]: number}>({});

  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [inclusionSearch, setInclusionSearch] = useState('');

  // Generated quote and editing
  const [generatedQuote, setGeneratedQuote] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<any>(null);

  useEffect(() => {
    if (location.state?.editQuote) {
      const quote = location.state.editQuote;
      setEditingQuote(quote);
      setCustomerName(quote.client_name || '');
      setReferenceNumber(quote.reference_number || '');
      setCheckInDate(quote.travel_dates_from || '');
      setCheckOutDate(quote.travel_dates_to || '');
      setAdults(quote.adults || 2);
      setInfants(quote.infants || 0);
      setCnb(quote.cnb || 0);
      setCwb(quote.cwb || 0);
      
      // Load existing hotel selection
      if (quote.selectedHotels && Array.isArray(quote.selectedHotels)) {
        const existingHotels = quote.selectedHotels.map(hotelData => 
          hotels.find(h => h.id === hotelData.id) || hotelData
        ).filter(Boolean);
        setSelectedHotels(existingHotels);
      } else if (quote.selectedHotel) {
        const existingHotel = hotels.find(h => h.id === quote.selectedHotel.id) || quote.selectedHotel;
        if (existingHotel) {
          setSelectedHotels([existingHotel]);
        }
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
      
      // Load existing occupancy selections
      if (quote.selectedOccupancies && Array.isArray(quote.selectedOccupancies)) {
        setSelectedOccupancies(quote.selectedOccupancies);
      }
      
      // Load editable rates if they exist
      if (quote.editableRates) {
        setEditableRates(quote.editableRates);
      }
      
      // Restore the generated quote preview if it exists
      if (quote.formattedText || quote.calculations) {
        setGeneratedQuote(quote);
      }
      
      // Clear the location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, hotels, tours, inclusions]);

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

  const totalPax = adults + cnb + cwb;

  // Tour management functions
  const addTour = (tour: any) => {
    if (!selectedTours.find(t => t.id === tour.id)) {
      setSelectedTours([...selectedTours, tour]);
      const rateKey = `tour_${tour.id}`;
      setEditableRates(prevRates => ({
        ...prevRates,
        [rateKey]: tour.costPerPerson
      }));
    }
  };

  const removeTour = (tourId: string) => {
    setSelectedTours(selectedTours.filter(tour => tour.id !== tourId));
    const rateKey = `tour_${tourId}`;
    setEditableRates(prevRates => {
      const newRates = { ...prevRates };
      delete newRates[rateKey];
      return newRates;
    });
  };

  // Toggle inclusion function
  const toggleInclusion = (inclusion: any) => {
    if (selectedInclusions.find(i => i.id === inclusion.id)) {
      setSelectedInclusions(selectedInclusions.filter(i => i.id !== inclusion.id));
      const rateKey = `inclusion_${inclusion.id}`;
      setEditableRates(prevRates => {
        const newRates = { ...prevRates };
        delete newRates[rateKey];
        return newRates;
      });
    } else {
      setSelectedInclusions([...selectedInclusions, inclusion]);
      const rateKey = `inclusion_${inclusion.id}`;
      setEditableRates(prevRates => ({
        ...prevRates,
        [rateKey]: inclusion.cost
      }));
    }
  };

  // Add/remove hotel functions with auto-sort
  const addHotel = (hotel: any) => {
    if (!selectedHotels.find(h => h.id === hotel.id)) {
      const newHotels = [...selectedHotels, hotel];
      newHotels.sort((a, b) => {
        const rateA = editableRates[`hotel_${a.id}`] ?? a.baseRate ?? 0;
        const rateB = editableRates[`hotel_${b.id}`] ?? b.baseRate ?? 0;
        return rateA - rateB;
      });
      setSelectedHotels(newHotels);
      const rateKey = `hotel_${hotel.id}`;
      const extraBedKey = `hotel_${hotel.id}_extrabed`;
      setEditableRates(prevRates => ({
        ...prevRates,
        [rateKey]: hotel.baseRate,
        [extraBedKey]: hotel.extraBedRate
      }));
    }
  };

  const removeHotel = (hotelId: string) => {
    setSelectedHotels(selectedHotels.filter(hotel => hotel.id !== hotelId));
    const rateKey = `hotel_${hotelId}`;
    const extraBedKey = `hotel_${hotelId}_extrabed`;
    setEditableRates(prevRates => {
      const newRates = { ...prevRates };
      delete newRates[rateKey];
      delete newRates[extraBedKey];
      return newRates;
    });
  };

  // Auto-sort hotels whenever rates change
  useEffect(() => {
    if (selectedHotels.length > 0) {
      const sortedHotels = [...selectedHotels].sort((a, b) => {
        const rateA = editableRates[`hotel_${a.id}`] ?? a.baseRate ?? 0;
        const rateB = editableRates[`hotel_${b.id}`] ?? b.baseRate ?? 0;
        return rateA - rateB;
      });
      const orderChanged = sortedHotels.some((hotel, idx) => hotel.id !== selectedHotels[idx]?.id);
      if (orderChanged) {
        setSelectedHotels(sortedHotels);
      }
    }
  }, [editableRates]);

  // Helper function to get private transfer cost based on PAX
  const getPrivateTransferCost = (tour: any, pax: number): number => {
    if (tour.type !== 'private') return 0;
    
    if (pax <= 5) {
      return tour.transferPrice1to5Pax || 0;
    } else if (pax <= 12) {
      return tour.transferPrice6to12Pax || 0;
    } else if (pax <= 22) {
      return tour.transferPrice13to22Pax || 0;
    }
    return 0;
  };

  // NEW PRICING LOGIC - Complete rewrite according to user specs
  const calculateQuote = () => {
    if (selectedHotels.length === 0 || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing Information",
        description: "Please select at least one hotel and dates",
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

    const exchangeRate = 3.65; // User specified USD conversion rate
    
    // Calculate for each hotel and occupancy type combination
    const hotelOptions = selectedHotels.map(hotel => {
      const occupancyOptions = selectedOccupancies.map(occupancyType => {
        const hotelRateKey = `hotel_${hotel.id}`;
        const extraBedKey = `hotel_${hotel.id}_extrabed`;
        const hotelRate = editableRates[hotelRateKey] ?? hotel.baseRate ?? 0;
        const extraBedRate = editableRates[extraBedKey] ?? hotel.extraBedRate ?? 0;

        // CORRECT PRICING LOGIC PER USER SPECIFICATION
        // Hotel: (Per night price * No of nights) / Selected Occupancy
        let adultPerPersonHotelCostAED = 0;
        
        if (occupancyType === 'SGL') {
          // Single occupancy: full room price per adult
          adultPerPersonHotelCostAED = (hotelRate * nights) / 1;
        } else if (occupancyType === 'DBL') {
          // Double occupancy: room price divided by 2 adults
          adultPerPersonHotelCostAED = (hotelRate * nights) / 2;
        } else if (occupancyType === 'TPL') {
          // Triple occupancy: (per night rate + extra bed rate) * no of nights / 03 PAX
          adultPerPersonHotelCostAED = ((hotelRate + extraBedRate) * nights) / 3;
        }

        // Tours cost per adult
        const toursPerAdultAED = selectedTours.reduce((total, tour) => {
          const rateKey = `tour_${tour.id}`;
          const ticketPrice = editableRates[rateKey] ?? tour.costPerPerson;
          
          if (tour.type === 'private') {
            const transferCost = getPrivateTransferCost(tour, totalPax);
            const perPersonCost = ticketPrice + (transferCost / totalPax);
            return total + perPersonCost;
          } else {
            // Sharing tour: just ticket price per person
            return total + ticketPrice;
          }
        }, 0);
        
        // Inclusions cost per adult (check for adult-specific cost)
        const inclusionsPerAdultAED = selectedInclusions.reduce((total, inclusion) => {
          const rateKey = `inclusion_${inclusion.id}`;
          // Use adultCost if available, otherwise use cost
          const rate = inclusion.adultCost || (editableRates[rateKey] ?? inclusion.cost);
          return total + rate;
        }, 0);
        
        // Per person ADULT total in AED
        const perPersonAdultAED = adultPerPersonHotelCostAED + toursPerAdultAED + inclusionsPerAdultAED;
        const perPersonAdultUSD = perPersonAdultAED / exchangeRate;

        // Total for all adults
        const totalAdultsAED = perPersonAdultAED * adults;
        const totalAdultsUSD = totalAdultsAED / exchangeRate;

        // CHILD WITH BED (CWB): (extra bed rate per night * no of nights) + tours + inclusions
        let perPersonCwbAED = 0;
        let totalCwbAED = 0;
        let perPersonCwbUSD = 0;
        let totalCwbUSD = 0;
        if (cwb > 0) {
          const cwbHotelCostAED = extraBedRate * nights;
          const cwbToursAED = selectedTours.reduce((total, tour) => {
            const rateKey = `tour_${tour.id}`;
            const ticketPrice = editableRates[rateKey] ?? tour.costPerPerson;
            
            if (tour.type === 'private') {
              const transferCost = getPrivateTransferCost(tour, totalPax);
              const perPersonCost = ticketPrice + (transferCost / totalPax);
              return total + perPersonCost;
            } else {
              return total + ticketPrice;
            }
          }, 0);
          
          const cwbInclusionsAED = selectedInclusions.reduce((total, inclusion) => {
            const rateKey = `inclusion_${inclusion.id}`;
            // Use childCost if available, otherwise use cost
            const rate = inclusion.childCost || (editableRates[rateKey] ?? inclusion.cost);
            return total + rate;
          }, 0);
          
          perPersonCwbAED = cwbHotelCostAED + cwbToursAED + cwbInclusionsAED;
          perPersonCwbUSD = perPersonCwbAED / exchangeRate;
          totalCwbAED = perPersonCwbAED * cwb;
          totalCwbUSD = totalCwbAED / exchangeRate;
        }

        // CHILD WITHOUT BED (CNB): only tours + inclusions
        let perPersonCnbAED = 0;
        let totalCnbAED = 0;
        let perPersonCnbUSD = 0;
        let totalCnbUSD = 0;
        if (cnb > 0) {
          const cnbToursAED = selectedTours.reduce((total, tour) => {
            const rateKey = `tour_${tour.id}`;
            const ticketPrice = editableRates[rateKey] ?? tour.costPerPerson;
            
            if (tour.type === 'private') {
              const transferCost = getPrivateTransferCost(tour, totalPax);
              const perPersonCost = ticketPrice + (transferCost / totalPax);
              return total + perPersonCost;
            } else {
              return total + ticketPrice;
            }
          }, 0);
          
          const cnbInclusionsAED = selectedInclusions.reduce((total, inclusion) => {
            const rateKey = `inclusion_${inclusion.id}`;
            // Use childCost if available, otherwise use cost
            const rate = inclusion.childCost || (editableRates[rateKey] ?? inclusion.cost);
            return total + rate;
          }, 0);
          
          perPersonCnbAED = cnbToursAED + cnbInclusionsAED;
          perPersonCnbUSD = perPersonCnbAED / exchangeRate;
          totalCnbAED = perPersonCnbAED * cnb;
          totalCnbUSD = totalCnbAED / exchangeRate;
        }

        // Grand totals
        const totalCostAED = totalAdultsAED + totalCwbAED + totalCnbAED;
        const totalCostUSD = totalCostAED / exchangeRate;

        return {
          occupancyType,
          adultPerPersonHotelCostAED,
          toursPerAdultAED,
          inclusionsPerAdultAED,
          perPersonAdultAED,
          perPersonAdultUSD,
          totalAdultsAED,
          totalAdultsUSD,
          perPersonCwbAED,
          perPersonCwbUSD,
          totalCwbAED,
          totalCwbUSD,
          perPersonCnbAED,
          perPersonCnbUSD,
          totalCnbAED,
          totalCnbUSD,
          totalCostAED,
          totalCostUSD
        };
      });
      
      return {
        hotel,
        occupancyOptions
      };
    });

    const quote = {
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
      exchangeRate,
      totalPax
    };

    setGeneratedQuote(quote);
    generateQuoteText(quote);
  };

  // Generate quote text function with star ratings and correct format
  const generateQuoteText = (quote: any) => {
    const { hotelOptions, paxDetails, nights, totalPax } = quote;
    
    let quoteHTML = `<div style="font-family: Arial, sans-serif; line-height: 1.3; font-size: 13px;">`;
    quoteHTML += `Dear Partner,<br /><br />`;
    quoteHTML += `Greetings for the day…!!!<br /><br />`;
    quoteHTML += `Pleased to quote you as below :<br /><br />`;
    quoteHTML += `Kindly check the rate / hotel availability with us when your client is ready to book<br /><br />`;
    
    // Pax summary
    let paxSummary = '';
    if (paxDetails.adults > 0) {
      paxSummary += `${paxDetails.adults} Adult${paxDetails.adults > 1 ? 's' : ''}`;
    }
    if (paxDetails.cwb > 0) {
      if (paxSummary) paxSummary += ', ';
      paxSummary += `${paxDetails.cwb} Child${paxDetails.cwb > 1 ? 'ren' : ''} with Bed`;
    }
    if (paxDetails.cnb > 0) {
      if (paxSummary) paxSummary += ', ';
      paxSummary += `${paxDetails.cnb} Child${paxDetails.cnb > 1 ? 'ren' : ''} without Bed`;
    }
    if (paxDetails.infants > 0) {
      if (paxSummary) paxSummary += ', ';
      paxSummary += `${paxDetails.infants} Infant${paxDetails.infants > 1 ? 's' : ''}`;
    }
    
    quoteHTML += `<strong>No of Pax:</strong> ${paxSummary}<br />`;
    quoteHTML += `<strong>Check-in:</strong> ${format(new Date(checkInDate), 'do MMMM yyyy')}<br />`;
    quoteHTML += `<strong>Check-out:</strong> ${format(new Date(checkOutDate), 'do MMMM yyyy')}<br /><br />`;

    // Hotel pricing table with STAR RATINGS
    quoteHTML += `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 800px; font-size: 11px;">`;
    quoteHTML += `<tr>`;
    quoteHTML += `<td><strong>Hotel Name</strong></td>`;
    
    // Add headers based on selected occupancies
    if (selectedOccupancies.includes('DBL')) {
      quoteHTML += `<td style="padding: 4px;"><strong>Adult Price (Double Occupancy)</strong></td>`;
    }
    if (selectedOccupancies.includes('SGL')) {
      quoteHTML += `<td style="padding: 4px;"><strong>Adult Price (Single Occupancy)</strong></td>`;
    }
    if (selectedOccupancies.includes('TPL')) {
      quoteHTML += `<td style="padding: 4px;"><strong>Adult Price (Triple Occupancy)</strong></td>`;
    }
    if (paxDetails.cwb > 0) {
      quoteHTML += `<td style="padding: 4px;"><strong>Price (Child with Bed)</strong></td>`;
    }
    if (paxDetails.cnb > 0) {
      quoteHTML += `<td style="padding: 4px;"><strong>Price (Child without Bed)</strong></td>`;
    }
    
    quoteHTML += `</tr>`;
    quoteHTML += `<tbody>`;
    
    // Add row for each hotel with STAR RATING
    hotelOptions.forEach((hotelOption: any) => {
      const hotel = hotelOption.hotel;
      // Show star rating if hotel, show "Apartment" if apartment
      const hotelName = hotel.category === 'apartment' 
        ? `${hotel.name} (Apartment)` 
        : `${hotel.name} ${hotel.starRating}*`;
      
      quoteHTML += `<tr><td style="padding: 4px;">${hotelName}</td>`;
      
      // Add pricing for each occupancy type for this hotel
      hotelOption.occupancyOptions.forEach((option: any) => {
        const perPersonUSD = Math.round(option.perPersonAdultUSD);
        const bbText = hotel.category === 'apartment' ? '' : ' with BB';
        quoteHTML += `<td style="padding: 4px;">USD ${perPersonUSD} per person${bbText}</td>`;
      });
      
      // Add child prices if applicable
      if (paxDetails.cwb > 0) {
        const cwbUSD = Math.round(hotelOption.occupancyOptions[0].perPersonCwbUSD);
        const bbText = hotel.category === 'apartment' ? '' : ' with BB';
        quoteHTML += `<td style="padding: 4px;">USD ${cwbUSD} per person${bbText}</td>`;
      }
      
      if (paxDetails.cnb > 0) {
        const cnbUSD = Math.round(hotelOption.occupancyOptions[0].perPersonCnbUSD);
        quoteHTML += `<td style="padding: 4px;">USD ${cnbUSD} per person</td>`;
      }
      
      quoteHTML += `</tr>`;
    });
    
    quoteHTML += `</tbody></table><br /><br />`;

    // Inclusions section
    quoteHTML += `<strong><u>Inclusions:</u></strong><br /><br />`;
    quoteHTML += `<ul class="list-disc list-inside space-y-1">`;
    quoteHTML += `<li><strong>${String(nights).padStart(2, '0')}</strong> Night${nights > 1 ? "'s" : ""} accommodation in above specified hotel(s)</li>`;
    
    // Only show "Daily Breakfast" for hotels, not apartments
    const hasHotels = selectedHotels.some(h => h.category === 'hotel');
    if (hasHotels) {
      quoteHTML += `<li>Daily Breakfast</li>`;
    }
    
    // Add selected tours - group by type
    const sharingTours = selectedTours.filter(t => t.type === 'group');
    const privateTours = selectedTours.filter(t => t.type === 'private');
    
    if (sharingTours.length > 0) {
      quoteHTML += `<li><strong>Sharing Tours:</strong></li>`;
      sharingTours.forEach((tour: any) => {
        quoteHTML += `<li>&nbsp;&nbsp;• ${tour.name}</li>`;
      });
    }
    
    if (privateTours.length > 0) {
      quoteHTML += `<li><strong>Private Tours:</strong></li>`;
      privateTours.forEach((tour: any) => {
        quoteHTML += `<li>&nbsp;&nbsp;• ${tour.name}</li>`;
      });
    }
    
    // Add ALL selected inclusions
    selectedInclusions.forEach((inclusion: any) => {
      quoteHTML += `<li>${inclusion.name}</li>`;
    });
    
    // Standard inclusions
    quoteHTML += `<li>All transfers on a SIC basis</li>`;
    quoteHTML += `<li>All taxes except Tourism Dirham</li>`;
    quoteHTML += `</ul><br /><br />`;

    quoteHTML += `<strong>Note: Rates and rooms are subject to change at the time of confirmation. / Rates quoted are fully nonrefundable</strong><br /><br />`;
    quoteHTML += `Should you need any clarifications on the above or require further assistance, please feel free to contact me at any time.<br />`;
    quoteHTML += `Looking forward to your earliest reply...<br /><br />`;
    quoteHTML += `<em style="color: red;">`;
    quoteHTML += `Note: As per the Dubai Executive Council Resolution No. (2) of 2014, a "Tourism Dirham (TD)" charge of AED 10 to AED 20 per room per night (depending on the Hotel Classification category) will apply for hotel rooms and Suites. For Apartments, charges apply.`;
    quoteHTML += `</em><br /><br /><br />`;
    quoteHTML += `</div>`;

    quote.formattedText = quoteHTML;
    quote.breakdown = generateBreakdown(quote);
    setGeneratedQuote(quote);
  };

  // Generate breakdown with star ratings
  const generateBreakdown = (quote: any) => {
    const { hotelOptions, selectedTours, selectedInclusions, totalPax, nights } = quote;
    
    const checkInFormatted = new Date(checkInDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    const checkOutFormatted = new Date(checkOutDate).toLocaleDateString("en-GB", {
      day: "2-digit",  
      month: "short",
    });

    let breakdownText = `${checkInFormatted} - ${checkOutFormatted}\n`;
    breakdownText += `${String(nights).padStart(2, '0')} Nights\n`;
    
    // Pax text
    let paxText = `${adults} Adults`;
    if (cwb > 0) paxText += ` + ${cwb} Child with Bed`;
    if (cnb > 0) paxText += ` + ${cnb} Child without Bed`;
    if (infants > 0) paxText += ` + ${infants} Infant`;
    breakdownText += `${paxText}\n\n`;
    
    // Hotels with star ratings and extra bed if needed
    hotelOptions.forEach((hotelOption: any) => {
      const hotel = hotelOption.hotel;
      const hotelRateKey = `hotel_${hotel.id}`;
      const extraBedKey = `hotel_${hotel.id}_extrabed`;
      const rate = editableRates[hotelRateKey] ?? hotel.baseRate;
      const extraBedRate = editableRates[extraBedKey] ?? hotel.extraBedRate;
      
      // Show star rating in breakdown too
      const hotelName = hotel.category === 'apartment' 
        ? `${hotel.name} (Apartment)` 
        : `${hotel.name} ${hotel.starRating}*`;
      
      // Show extra bed rate if CWB or triple occupancy selected
      const showExtraBed = cwb > 0 || selectedOccupancies.includes('TPL');
      if (showExtraBed) {
        breakdownText += `${hotelName} - ${rate}/night | ${extraBedRate} EB/night\n`;
      } else {
        breakdownText += `${hotelName} - ${rate}/night\n`;
      }
    });
    
    breakdownText += `\n`;
    
    // Tours - showing per person price with distinction
    let toursAndInclusionsTotal = 0;
    
    const sharingTours = selectedTours.filter(t => t.type === 'group');
    const privateTours = selectedTours.filter(t => t.type === 'private');
    
    if (sharingTours.length > 0) {
      breakdownText += `Sharing Tours:\n`;
      sharingTours.forEach((tour: any) => {
        const rateKey = `tour_${tour.id}`;
        const perPersonRate = editableRates[rateKey] ?? tour.costPerPerson;
        breakdownText += `  ${tour.name} - ${perPersonRate}/person\n`;
        toursAndInclusionsTotal += perPersonRate;
      });
    }
    
    if (privateTours.length > 0) {
      breakdownText += `Private Tours:\n`;
      privateTours.forEach((tour: any) => {
        const rateKey = `tour_${tour.id}`;
        const ticketPrice = editableRates[rateKey] ?? tour.costPerPerson;
        const transferCost = getPrivateTransferCost(tour, totalPax);
        const perPersonTransfer = transferCost / totalPax;
        const totalPerPerson = ticketPrice + perPersonTransfer;
        breakdownText += `  ${tour.name} - Ticket: ${ticketPrice} + Transfer: ${perPersonTransfer.toFixed(2)} = ${totalPerPerson.toFixed(2)}/person\n`;
        toursAndInclusionsTotal += totalPerPerson;
      });
    }
    
    // Inclusions
    selectedInclusions.forEach((inclusion: any) => {
      const rateKey = `inclusion_${inclusion.id}`;
      const perPersonRate = editableRates[rateKey] ?? inclusion.cost;
      breakdownText += `${inclusion.name} - ${perPersonRate}/person\n`;
      toursAndInclusionsTotal += perPersonRate;
    });
    
    // Total per person for tours and inclusions
    breakdownText += `Total - ${toursAndInclusionsTotal.toFixed(2)} | per person\n`;
    
    return breakdownText;
  };

  // Copy formatted text
  const copyFormattedText = () => {
    if (!generatedQuote?.formattedText) return;
    
    const quotePreview = document.querySelector('[data-quote-preview]');
    if (quotePreview) {
      const range = document.createRange();
      range.selectNodeContents(quotePreview);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);

        try {
          document.execCommand("copy");
          selection.removeAllRanges();
          toast({ title: "Copied!", description: "Formatted quote copied to clipboard" });
        } catch (err) {
          console.error("Copy failed:", err);
          toast({ title: "Error", description: "Failed to copy formatted quote" });
        }
      }
    }
  };

  // Copy breakdown
  const copyBreakdown = () => {
    if (!generatedQuote?.breakdown) return;
    
    navigator.clipboard.writeText(generatedQuote.breakdown);
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
      const firstHotel = generatedQuote.hotelOptions[0];
      const dblOption = firstHotel?.occupancyOptions?.find((opt: any) => opt.occupancyType === 'DBL') || firstHotel?.occupancyOptions?.[0];
      
      const quoteDataJSON = JSON.stringify({
        hotelOptions: generatedQuote.hotelOptions,
        selectedHotels,
        selectedTours,
        selectedInclusions,
        occupancies: selectedOccupancies,
        editableRates
      });
      
      const dataToSave = {
        reference_number: editingQuote?.reference_number || `QT-${Date.now()}`,
        client_name: customerName,
        ticket_reference: referenceNumber,
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
        notes: `${generatedQuote.breakdown}\n\n---QUOTE_DATA---\n${quoteDataJSON}`
      };

      if (editingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update(dataToSave)
          .eq('id', editingQuote.id);
          
        if (error) throw error;
        toast({
          title: "Quote Updated",
          description: "Quote has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert([dataToSave]);
          
        if (error) throw error;
        toast({
          title: "Quote Saved",
          description: "Quote has been saved successfully"
        });
      }

      navigate('/quotes');
    } catch (error) {
      console.error('Save error:', error);
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
      <Card className="shadow-card">
        <CardHeader className="p-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-4 w-4 text-primary" />
            Package Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
              <TabsTrigger value="tours">Tours</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Details */}
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName" className="text-xs font-medium">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="referenceNumber" className="text-xs font-medium">TKT Reference</Label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter ticket reference"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="checkin" className="text-xs font-medium">Check-in Date *</Label>
                  <Input
                    id="checkin"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="checkout" className="text-xs font-medium">Check-out Date *</Label>
                  <Input
                    id="checkout"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Pax Details */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-medium">
                  <Users className="h-3 w-3" />
                  Passenger Details
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium">Adults</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{adults}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdults(adults + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium">CWB</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCwb(Math.max(0, cwb - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{cwb}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCwb(cwb + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium">CNB</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCnb(Math.max(0, cnb - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{cnb}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCnb(cnb + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium">Infants</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{infants}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfants(infants + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Occupancy Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Room Occupancy Types *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {occupancyTypes.map((occ) => (
                    <div
                      key={occ.id}
                      className={cn(
                        "flex items-center space-x-2 border rounded-md p-2 cursor-pointer transition-colors",
                        selectedOccupancies.includes(occ.id) 
                          ? "bg-primary/10 border-primary" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        if (selectedOccupancies.includes(occ.id)) {
                          setSelectedOccupancies(selectedOccupancies.filter(o => o !== occ.id));
                        } else {
                          setSelectedOccupancies([...selectedOccupancies, occ.id]);
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedOccupancies.includes(occ.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOccupancies([...selectedOccupancies, occ.id]);
                          } else {
                            setSelectedOccupancies(selectedOccupancies.filter(o => o !== occ.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-xs font-semibold">{occ.label}</div>
                        <div className="text-[10px] text-muted-foreground">{occ.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Accommodation Selection */}
            <TabsContent value="accommodation" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Search Hotels & Apartments</Label>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    placeholder="Type to search hotels or apartments..."
                    className="pl-10 h-9"
                  />
                </div>

                {/* Search Results */}
                {filteredHotels.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredHotels.map((hotel) => (
                      <div
                        key={hotel.id}
                        onClick={() => {
                          addHotel(hotel);
                          setHotelSearch('');
                        }}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {hotel.name} 
                            {hotel.category === 'apartment' ? (
                              <Badge variant="secondary" className="ml-2 text-[10px]">Apartment</Badge>
                            ) : (
                              <span className="text-muted-foreground ml-2 text-xs">({hotel.starRating}⭐)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {hotel.location}
                          </div>
                          <div className="text-xs text-primary mt-1">
                            AED {hotel.baseRate}/night
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Hotels List Format */}
                {selectedHotels.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Hotels ({selectedHotels.length})</Label>
                    <div className="space-y-2">
                      {selectedHotels.map((hotel) => (
                        <div key={hotel.id} className="border rounded-md p-3 bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {hotel.name}
                                {hotel.category === 'apartment' ? (
                                  <Badge variant="secondary" className="text-[10px]">Apartment</Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">({hotel.starRating}⭐)</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{hotel.location}</div>
                              
                              {/* Editable Rate */}
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-medium">Room Rate (AED/night)</Label>
                                  <Input
                                    type="number"
                                    value={editableRates[`hotel_${hotel.id}`] ?? hotel.baseRate}
                                    onChange={(e) => setEditableRates(prev => ({
                                      ...prev,
                                      [`hotel_${hotel.id}`]: Number(e.target.value)
                                    }))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                
                                {/* Show Extra Bed Rate if CWB or Triple Occupancy selected */}
                                {(cwb > 0 || selectedOccupancies.includes('TPL')) && (
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-medium">Extra Bed (AED/night)</Label>
                                    <Input
                                      type="number"
                                      value={editableRates[`hotel_${hotel.id}_extrabed`] ?? hotel.extraBedRate}
                                      onChange={(e) => setEditableRates(prev => ({
                                        ...prev,
                                        [`hotel_${hotel.id}_extrabed`]: Number(e.target.value)
                                      }))}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHotel(hotel.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Tours Selection */}
            <TabsContent value="tours" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Search Tours</Label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={tourSearch}
                    onChange={(e) => setTourSearch(e.target.value)}
                    placeholder="Type to search tours..."
                    className="pl-10 h-9"
                  />
                </div>

                {/* Search Results */}
                {filteredTours.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredTours.map((tour) => (
                      <div
                        key={tour.id}
                        onClick={() => {
                          addTour(tour);
                          setTourSearch('');
                        }}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {tour.name}
                            <Badge variant={tour.type === 'private' ? 'default' : 'secondary'} className="text-[10px]">
                              {tour.type === 'private' ? 'Private' : 'Sharing'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{tour.duration}</div>
                          <div className="text-xs text-primary mt-1">
                            AED {tour.costPerPerson}/person
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Tours List Format - Grouped by Type */}
                {selectedTours.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Selected Tours ({selectedTours.length})</Label>
                    
                    {/* Sharing Tours */}
                    {selectedTours.filter(t => t.type === 'group').length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">SHARING TOURS</div>
                        {selectedTours.filter(t => t.type === 'group').map((tour) => (
                          <div key={tour.id} className="border rounded-md p-3 bg-muted/30">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{tour.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">{tour.duration}</div>
                                
                                <div className="mt-2 space-y-1">
                                  <Label className="text-[10px] font-medium">Ticket Price (AED/person)</Label>
                                  <Input
                                    type="number"
                                    value={editableRates[`tour_${tour.id}`] ?? tour.costPerPerson}
                                    onChange={(e) => setEditableRates(prev => ({
                                      ...prev,
                                      [`tour_${tour.id}`]: Number(e.target.value)
                                    }))}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTour(tour.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Private Tours */}
                    {selectedTours.filter(t => t.type === 'private').length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">PRIVATE TOURS</div>
                        {selectedTours.filter(t => t.type === 'private').map((tour) => {
                          const transferCost = getPrivateTransferCost(tour, totalPax);
                          const ticketPrice = editableRates[`tour_${tour.id}`] ?? tour.costPerPerson;
                          const perPersonTransfer = transferCost / totalPax;
                          
                          return (
                            <div key={tour.id} className="border rounded-md p-3 bg-muted/30">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{tour.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">{tour.duration}</div>
                                  
                                  <div className="mt-2 space-y-2">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-medium">Ticket Price (AED/person)</Label>
                                      <Input
                                        type="number"
                                        value={ticketPrice}
                                        onChange={(e) => setEditableRates(prev => ({
                                          ...prev,
                                          [`tour_${tour.id}`]: Number(e.target.value)
                                        }))}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    
                                    <div className="text-xs space-y-1">
                                      <div className="text-muted-foreground">Transfer: AED {transferCost.toFixed(2)} ÷ {totalPax} pax = AED {perPersonTransfer.toFixed(2)}/person</div>
                                      <div className="font-semibold text-primary">
                                        Total: AED {(ticketPrice + perPersonTransfer).toFixed(2)}/person
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTour(tour.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Services/Inclusions Selection */}
            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Search Services & Inclusions</Label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={inclusionSearch}
                    onChange={(e) => setInclusionSearch(e.target.value)}
                    placeholder="Type to search services..."
                    className="pl-10 h-9"
                  />
                </div>

                {/* Search Results */}
                {filteredInclusions.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredInclusions.map((inclusion) => (
                      <div
                        key={inclusion.id}
                        onClick={() => {
                          toggleInclusion(inclusion);
                          setInclusionSearch('');
                        }}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{inclusion.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{inclusion.description}</div>
                          <div className="text-xs text-primary mt-1">
                            AED {inclusion.cost}/person
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Inclusions List Format */}
                {selectedInclusions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Services ({selectedInclusions.length})</Label>
                    <div className="space-y-2">
                      {selectedInclusions.map((inclusion) => (
                        <div key={inclusion.id} className="border rounded-md p-3 bg-muted/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{inclusion.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">{inclusion.description}</div>
                              
                              <div className="mt-2 space-y-1">
                                <Label className="text-[10px] font-medium">Price (AED/person)</Label>
                                <Input
                                  type="number"
                                  value={editableRates[`inclusion_${inclusion.id}`] ?? inclusion.cost}
                                  onChange={(e) => setEditableRates(prev => ({
                                    ...prev,
                                    [`inclusion_${inclusion.id}`]: Number(e.target.value)
                                  }))}
                                  className="h-8 text-xs"
                                />
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  Note: Create separate entries for Adult and Child pricing if needed (e.g., "Adult Visa" and "Child Visa")
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleInclusion(inclusion)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Generate Quote Button */}
          <div className="flex justify-center pt-4 border-t">
            <Button
              onClick={calculateQuote}
              size="lg"
              className="w-full md:w-auto"
              disabled={!customerName || !checkInDate || !checkOutDate || selectedHotels.length === 0}
            >
              <Calculator className="mr-2 h-5 w-5" />
              Generate Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Quote Preview */}
      {generatedQuote && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quote Preview */}
          <Card className="shadow-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg">Quote Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div
                data-quote-preview
                dangerouslySetInnerHTML={{ __html: generatedQuote.formattedText }}
                className="prose prose-sm max-w-none"
              />
              <div className="flex gap-2 mt-4">
                <Button onClick={copyFormattedText} variant="outline" size="sm" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Quote
                </Button>
                <Button onClick={downloadPDF} variant="outline" size="sm" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card className="shadow-card">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded-md">
                {generatedQuote.breakdown}
              </pre>
              <div className="flex gap-2 mt-4">
                <Button onClick={copyBreakdown} variant="outline" size="sm" className="flex-1">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Breakdown
                </Button>
                <Button onClick={saveQuote} variant="default" size="sm" className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Save Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QuoteTool;
