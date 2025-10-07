import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
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

// Input validation schema
const quoteFormSchema = z.object({
  customerName: z.string()
    .trim()
    .min(2, { message: "Customer name must be at least 2 characters" })
    .max(100, { message: "Customer name must be less than 100 characters" }),
  referenceNumber: z.string()
    .trim()
    .max(50, { message: "Reference number must be less than 50 characters" })
    .optional()
    .or(z.literal('')),
  checkInDate: z.string().min(1, { message: "Check-in date is required" }),
  checkOutDate: z.string().min(1, { message: "Check-out date is required" }),
});

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

  // Effects for editing
  useEffect(() => {
    if (location.state?.editQuote) {
      const quote = location.state.editQuote;
      setEditingQuote(quote);
      setCustomerName(quote.client_name || '');
      setReferenceNumber(quote.ticket_reference || '');
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
        // Backward compatibility for old quotes with single hotel
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
      // Set default rate for the tour
      const rateKey = `tour_${tour.id}`;
      setEditableRates(prevRates => ({
        ...prevRates,
        [rateKey]: tour.costPerPerson
      }));
    }
  };

  const removeTour = (tourId: string) => {
    setSelectedTours(selectedTours.filter(tour => tour.id !== tourId));
    // Remove rate from editable rates
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
      // Remove rate from editable rates
      const rateKey = `inclusion_${inclusion.id}`;
      setEditableRates(prevRates => {
        const newRates = { ...prevRates };
        delete newRates[rateKey];
        return newRates;
      });
    } else {
      setSelectedInclusions([...selectedInclusions, inclusion]);
      // Set default rate for the inclusion
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
      // Auto-sort by base rate (lowest to highest)
      newHotels.sort((a, b) => {
        const rateA = editableRates[`hotel_${a.id}`] ?? a.baseRate ?? 0;
        const rateB = editableRates[`hotel_${b.id}`] ?? b.baseRate ?? 0;
        return rateA - rateB;
      });
      setSelectedHotels(newHotels);
      // Set default rate for the hotel
      const rateKey = `hotel_${hotel.id}`;
      setEditableRates(prevRates => ({
        ...prevRates,
        [rateKey]: hotel.baseRate
      }));
    }
  };

  const removeHotel = (hotelId: string) => {
    setSelectedHotels(selectedHotels.filter(hotel => hotel.id !== hotelId));
    // Remove rate from editable rates
    const rateKey = `hotel_${hotelId}`;
    setEditableRates(prevRates => {
      const newRates = { ...prevRates };
      delete newRates[rateKey];
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
      // Only update if order changed
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

  // Calculate quote function with multiple occupancy options
  const calculateQuote = () => {
    // Validate form inputs
    try {
      quoteFormSchema.parse({
        customerName,
        referenceNumber,
        checkInDate,
        checkOutDate
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    // Validate dates
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      toast({
        title: "Invalid Dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive"
      });
      return;
    }

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

    const exchangeRate = 3.67;
    
    // Calculate for each hotel and occupancy type combination
    const hotelOptions = selectedHotels.map(hotel => {
      const occupancyOptions = selectedOccupancies.map(occupancyType => {
        let roomsNeeded = 1;
        let extraBeds = 0;
        let hotelRate = hotel.baseRate || 0;
        let extraBedRate = hotel.extraBedRate || 0;

        // Calculate rooms and extra beds based on occupancy type
        // Use editable rate for hotel if available
        const hotelRateKey = `hotel_${hotel.id}`;
        hotelRate = editableRates[hotelRateKey] ?? hotel.baseRate ?? 0;
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
        
        // Tours and inclusions cost using editable rates
        const toursCost = selectedTours.reduce((total, tour) => {
          const rateKey = `tour_${tour.id}`;
          const ticketPrice = editableRates[rateKey] ?? tour.costPerPerson;
          
          // For private tours, add per-person transfer cost
          if (tour.type === 'private') {
            const transferCost = getPrivateTransferCost(tour, totalPax);
            const perPersonCost = ticketPrice + (transferCost / totalPax);
            return total + (perPersonCost * totalPax);
          } else {
            // For sharing/group tours, just multiply by totalPax
            return total + (ticketPrice * totalPax);
          }
        }, 0);
        
        const inclusionsCost = selectedInclusions.reduce((total, inclusion) => {
          const rateKey = `inclusion_${inclusion.id}`;
          const rate = editableRates[rateKey] ?? inclusion.cost;
          return total + (rate * totalPax);
        }, 0);
        
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

  // Generate quote text function matching user's exact format with multiple hotels
  const generateQuoteText = (quote: any) => {
    const { hotelOptions, paxDetails, nights, totalPax } = quote;
    
    // Format exactly like the user's example
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

    // Hotel pricing table exactly like user's format with multiple hotels
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
    
    // Add row for each hotel
    hotelOptions.forEach((hotelOption: any) => {
      quoteHTML += `<tr><td style="padding: 4px;">${hotelOption.hotel.name}</td>`;
      
      // Add pricing for each occupancy type for this hotel
      hotelOption.occupancyOptions.forEach((option: any) => {
        const perPersonUSD = Math.round(option.perPersonUSD);
        quoteHTML += `<td style="padding: 4px;">USD ${perPersonUSD} per person with BB</td>`;
      });
      
      // Add child prices if applicable for this hotel
      if (paxDetails.cwb > 0) {
        const extraBedUSD = Math.round((hotelOption.hotel.extraBedRate * nights) / quote.exchangeRate);
        const toursCost = selectedTours.reduce((total, tour) => total + tour.costPerPerson, 0) / quote.exchangeRate;
        const inclusionsCost = selectedInclusions.reduce((total, inclusion) => total + inclusion.cost, 0) / quote.exchangeRate;
        const totalCwbUSD = Math.round(extraBedUSD + toursCost + inclusionsCost);
        quoteHTML += `<td style="padding: 4px;">USD ${totalCwbUSD} per person with BB</td>`;
      }
      
      if (paxDetails.cnb > 0) {
        const toursCost = selectedTours.reduce((total, tour) => total + tour.costPerPerson, 0) / quote.exchangeRate;
        const inclusionsCost = selectedInclusions.reduce((total, inclusion) => total + inclusion.cost, 0) / quote.exchangeRate;
        const totalCnbUSD = Math.round(toursCost + inclusionsCost);
        quoteHTML += `<td style="padding: 4px;">USD ${totalCnbUSD} per person</td>`;
      }
      
      quoteHTML += `</tr>`;
    });
    
    quoteHTML += `</tbody></table><br /><br />`;

    // Inclusions section exactly like user's format - include all services here
    quoteHTML += `<strong><u>Inclusions:</u></strong><br /><br />`;
    quoteHTML += `<ul class="list-disc list-inside space-y-1">`;
    quoteHTML += `<li><strong>${String(nights).padStart(2, '0')}</strong> Night${nights > 1 ? "'s" : ""} accommodation in above specified hotel(s)</li>`;
    quoteHTML += `<li>Daily Breakfast</li>`;
    
    // Add selected tours
    selectedTours.forEach((tour: any) => {
      quoteHTML += `<li>${tour.name}</li>`;
    });
    
    // Add ALL selected inclusions (not just visa/transfer)
    selectedInclusions.forEach((inclusion: any) => {
      quoteHTML += `<li>${inclusion.name}</li>`;
    });
    
    // Standard inclusions
    quoteHTML += `<li>All transfers on a SIC basis</li>`;
    quoteHTML += `<li>All taxes except Tourism Dirham</li>`;
    quoteHTML += `</ul><br /><br />`;
    
    // Note: Removed the "Optional Cost" section as requested - all services are now part of inclusions

    quoteHTML += `<strong>Note: Rates and rooms are subject to change at the time of confirmation. / Rates quoted are fully nonrefundable</strong><br /><br />`;
    quoteHTML += `Should you need any clarifications on the above or require further assistance, please feel free to contact me at any time.<br />`;
    quoteHTML += `Looking forward to your earliest reply...<br /><br />`;
    quoteHTML += `<em style="color: red;">`;
    quoteHTML += `Note: As per the Dubai Executive Council Resolution No. (2) of 2014, a "Tourism Dirham (TD)" charge of AED 10 to AED 20 per room per night (depending on the Hotel Classification category) will apply for hotel rooms and Suites. For Apartments, charges apply.`;
    quoteHTML += `</em><br /><br /><br />`;
    quoteHTML += `</div>`;

    quote.formattedText = quoteHTML;
    
    // Generate breakdown
    quote.breakdown = generateBreakdown(quote);
    
    setGeneratedQuote(quote);
  };

  // Generate breakdown following the exact format from the old quote tool
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
    
    // Pax text - show all possible cases
    let paxText = `${adults} Adults`;
    if (cwb > 0) paxText += ` + ${cwb} Child with Bed`;
    if (cnb > 0) paxText += ` + ${cnb} Child without Bed`;
    if (infants > 0) paxText += ` + ${infants} Infant`;
    breakdownText += `${paxText}\n\n`;
    
    // Hotels - showing rate per room per night
    hotelOptions.forEach((hotelOption: any) => {
      const hotelRateKey = `hotel_${hotelOption.hotel.id}`;
      const rate = editableRates[hotelRateKey] ?? hotelOption.hotel.baseRate;
      
      const hasExtraBed = cwb > 0;
      if (hasExtraBed && hotelOption.hotel.extraBedRate) {
        const extraBedRateKey = `hotel_${hotelOption.hotel.id}_extrabed`;
        const extraBedRate = editableRates[extraBedRateKey] ?? hotelOption.hotel.extraBedRate;
        breakdownText += `${hotelOption.hotel.name} - ${rate}/night | ${extraBedRate} EB/night\n`;
      } else {
        breakdownText += `${hotelOption.hotel.name} - ${rate}/night\n`;
      }
    });
    
    breakdownText += `\n`;
    
    // Tours - showing per person price from actual selected rates
    let toursAndInclusionsTotal = 0;
    selectedTours.forEach((tour: any) => {
      const rateKey = `tour_${tour.id}`;
      const perPersonRate = editableRates[rateKey] ?? tour.costPerPerson;
      breakdownText += `${tour.name} - ${perPersonRate}\n`;
      toursAndInclusionsTotal += perPersonRate;
    });
    
    // Inclusions - showing per person price from actual selected rates
    selectedInclusions.forEach((inclusion: any) => {
      const rateKey = `inclusion_${inclusion.id}`;
      const perPersonRate = editableRates[rateKey] ?? inclusion.cost;
      breakdownText += `${inclusion.name} - ${perPersonRate}\n`;
      toursAndInclusionsTotal += perPersonRate;
    });
    
    // Total per person for tours and inclusions
    breakdownText += `Total - ${toursAndInclusionsTotal} | per person\n`;
    
    return breakdownText;
  };

  // Copy formatted text with proper table formatting - copies exactly as visible
  const copyFormattedText = () => {
    if (!generatedQuote?.formattedText) return;
    
    // Copy the rendered HTML content as formatted text
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
      const quoteData = {
        ticketReference: referenceNumber || editingQuote?.reference_number || `QT-${Date.now()}`,
        customerName,
        travelDates: {
          startDate: checkInDate,
          endDate: checkOutDate
        },
        paxDetails: { adults, infants, cnb, cwb },
        selectedHotels,
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
        // Save structured quote data as JSON
        const quoteDataJSON = JSON.stringify({
          hotelOptions: generatedQuote.hotelOptions,
          selectedHotels,
          selectedTours,
          selectedInclusions,
          occupancies: selectedOccupancies,
          editableRates
        });
        
        // Use database field names directly
        const updateData = {
          reference_number: editingQuote.reference_number,
          client_name: customerName,
          ticket_reference: referenceNumber || null,
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
        // Save structured quote data as JSON
        const quoteDataJSON = JSON.stringify({
          hotelOptions: generatedQuote.hotelOptions,
          selectedHotels,
          selectedTours,
          selectedInclusions,
          occupancies: selectedOccupancies,
          editableRates
        });
        
        // Use database field names directly  
        const insertData = {
          reference_number: `QT-${Date.now()}`,
          client_name: customerName,
          ticket_reference: referenceNumber || null,
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
                  <Label htmlFor="referenceNumber" className="text-xs font-medium">TKT Reference (Optional)</Label>
                  <Input
                    id="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Enter TKT reference if available"
                    className="h-9"
                    maxLength={50}
                  />
                  <p className="text-[10px] text-muted-foreground">User-provided ticket reference for tracking</p>
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
            </TabsContent>

            {/* Tab 2: Accommodation */}
            <TabsContent value="accommodation" className="space-y-4 mt-4">
              {/* Occupancy Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select Occupancy Types *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {occupancyTypes.map(occupancy => (
                  <div 
                    key={occupancy.id}
                    className="flex items-center space-x-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
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
                      <p className="font-medium text-xs">{occupancy.label}</p>
                      <p className="text-[10px] text-muted-foreground">{occupancy.description}</p>
                    </div>
                  </div>
                  ))}
                </div>
              </div>

              {/* Hotel Search */}
              <div className="space-y-2">
                <Label htmlFor="hotelSearch" className="text-xs font-medium">Search Hotels *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="hotelSearch"
                    placeholder="Search hotels..."
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                
                {/* Selected Hotels - List Format */}
                {selectedHotels.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold mb-3">Selected Hotels (sorted by price):</p>
                    <div className="border rounded-lg divide-y">
                      {selectedHotels.map((hotel, index) => (
                        <div key={hotel.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-sm font-medium text-muted-foreground w-6">#{index + 1}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-base">{hotel.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {hotel.location}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Rate:</Label>
                                <Input
                                  type="number"
                                  value={editableRates[`hotel_${hotel.id}`] ?? hotel.baseRate}
                                  onChange={(e) => setEditableRates(prev => ({
                                    ...prev,
                                    [`hotel_${hotel.id}`]: Number(e.target.value)
                                  }))}
                                  className="w-24 h-9"
                                />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">AED/night</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeHotel(hotel.id)}
                            className="ml-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Available Hotels - List Format */}
                {hotelSearch && (
                  <div className="mt-4 border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {filteredHotels.map(hotel => (
                      <div 
                        key={hotel.id} 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addHotel(hotel)}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{hotel.name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {hotel.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-primary">AED {hotel.baseRate}</p>
                          <p className="text-xs text-muted-foreground">per night</p>
                        </div>
                      </div>
                    ))}
                    {filteredHotels.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Tours */}
            <TabsContent value="tours" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="tourSearch" className="text-xs font-medium">Search Tours & Activities</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="tourSearch"
                    placeholder="Search tours..."
                    value={tourSearch}
                    onChange={(e) => setTourSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                
                {/* Selected Tours - List Format with Categories */}
                {selectedTours.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-semibold">Selected Tours:</p>
                    
                    {/* Sharing Tours */}
                    {selectedTours.filter(t => t.type === 'group').length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 border-b">
                          <p className="text-xs font-semibold">Sharing Tours</p>
                        </div>
                        <div className="divide-y">
                          {selectedTours.filter(t => t.type === 'group').map((tour) => (
                            <div key={tour.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{tour.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{tour.duration}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={editableRates[`tour_${tour.id}`] ?? tour.costPerPerson}
                                    onChange={(e) => setEditableRates(prev => ({
                                      ...prev,
                                      [`tour_${tour.id}`]: Number(e.target.value)
                                    }))}
                                    className="w-20 h-8 text-sm"
                                  />
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">AED</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeTour(tour.id)} className="h-7 w-7 p-0">
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Private Tours */}
                    {selectedTours.filter(t => t.type === 'private').length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 border-b">
                          <p className="text-xs font-semibold">Private Tours</p>
                        </div>
                        <div className="divide-y">
                          {selectedTours.filter(t => t.type === 'private').map((tour) => {
                            const transferCost = getPrivateTransferCost(tour, totalPax);
                            const ticketPrice = editableRates[`tour_${tour.id}`] ?? tour.costPerPerson;
                            const perPersonTotal = ticketPrice + (transferCost / totalPax);
                            
                            return (
                              <div key={tour.id} className="p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">{tour.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{tour.duration}</p>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => removeTour(tour.id)} className="h-7 w-7 p-0">
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="flex flex-col gap-0.5">
                                    <Label className="text-[10px] text-muted-foreground">Ticket Price</Label>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={ticketPrice}
                                        onChange={(e) => setEditableRates(prev => ({
                                          ...prev,
                                          [`tour_${tour.id}`]: Number(e.target.value)
                                        }))}
                                        className="w-full h-8 text-xs"
                                      />
                                      <span className="text-[10px] whitespace-nowrap">AED</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <Label className="text-[10px] text-muted-foreground">Transfer ({totalPax} PAX)</Label>
                                    <div className="h-8 px-2 flex items-center bg-muted rounded-md">
                                      <span className="font-semibold text-xs">AED {transferCost}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <Label className="text-[10px] text-muted-foreground">Per Person Total</Label>
                                    <div className="h-8 px-2 flex items-center bg-primary/10 rounded-md border border-primary/20">
                                      <span className="font-bold text-primary text-xs">AED {Math.ceil(perPersonTotal)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Available Tours - List Format */}
                {tourSearch && (
                  <div className="mt-3 border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {filteredTours.map(tour => (
                      <div 
                        key={tour.id} 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addTour(tour)}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{tour.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={tour.type === 'private' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                              {tour.type === 'private' ? 'Private' : 'Sharing'}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground">{tour.duration}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">AED {tour.costPerPerson}</p>
                          <p className="text-[10px] text-muted-foreground">per person</p>
                        </div>
                      </div>
                    ))}
                    {filteredTours.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 4: Additional Services */}
            <TabsContent value="services" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="inclusionSearch" className="text-xs font-medium">Search Additional Services</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="inclusionSearch"
                    placeholder="Search services..."
                    value={inclusionSearch}
                    onChange={(e) => setInclusionSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                
                {/* Selected Services - List Format */}
                {selectedInclusions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold">Selected Services:</p>
                    <div className="border rounded-lg divide-y">
                      {selectedInclusions.map((inclusion) => (
                        <div key={inclusion.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{inclusion.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{inclusion.type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editableRates[`inclusion_${inclusion.id}`] ?? inclusion.cost}
                                onChange={(e) => setEditableRates(prev => ({
                                  ...prev,
                                  [`inclusion_${inclusion.id}`]: Number(e.target.value)
                                }))}
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">AED</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => toggleInclusion(inclusion)} className="h-7 w-7 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Available Services - List Format */}
                {inclusionSearch && (
                  <div className="mt-3 border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {filteredInclusions.map(inclusion => (
                      <div 
                        key={inclusion.id} 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleInclusion(inclusion)}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{inclusion.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{inclusion.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">AED {inclusion.cost}</p>
                          <p className="text-[10px] text-muted-foreground">per person</p>
                        </div>
                      </div>
                    ))}
                    {filteredInclusions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No results found
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

              {/* Generate Button */}
              <div className="flex justify-center mt-6 pt-4 border-t">
                <Button 
                  onClick={calculateQuote}
                  size="default"
                  className="shadow-card hover:shadow-hover transition-shadow"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Generate Quote
                </Button>
              </div>
        </CardContent>
      </Card>

      {/* Quote Preview with HTML rendering */}
      {generatedQuote && generatedQuote.formattedText && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-dubai-gold" />
                Generated Quote Preview
              </span>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={copyFormattedText}>
                   <Copy className="h-4 w-4 mr-2" />
                   Copy Quote
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
            {/* HTML Preview with proper borders and copy functionality */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm mb-6">
              <style dangerouslySetInnerHTML={{
                __html: `
                  [data-quote-preview] table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10px 0;
                  }
                  [data-quote-preview] table, 
                  [data-quote-preview] th, 
                  [data-quote-preview] td {
                    border: 1px solid #000 !important;
                  }
                  [data-quote-preview] th, 
                  [data-quote-preview] td {
                    padding: 8px;
                    text-align: left;
                  }
                  [data-quote-preview] th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                  }
                `
              }} />
              <div 
                data-quote-preview
                dangerouslySetInnerHTML={{ __html: generatedQuote.formattedText || '' }}
                className="prose max-w-none"
                style={{ 
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.3',
                  fontSize: '13px'
                }}
              />
            </div>
            
            {/* Breakdown Preview */}
            {generatedQuote.breakdown && (
              <div className="bg-gray-50 p-6 rounded-lg border mb-6">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
                <pre className="whitespace-pre-line font-mono text-sm">
                  {generatedQuote.breakdown}
                </pre>
              </div>
            )}

            {/* Detailed Pricing Table for Reference */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detailed Pricing (All Hotels & Occupancy Types)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Hotel</th>
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
                    {generatedQuote?.hotelOptions?.map((hotelOption: any, hotelIndex: number) => 
                      hotelOption.occupancyOptions?.map((option: any, optionIndex: number) => (
                        <tr key={`${hotelIndex}-${optionIndex}`} className={option.occupancyType === 'DBL' ? 'bg-blue-50' : 'bg-white'}>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            {hotelOption.hotel?.name || 'Hotel'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 font-medium">
                            {option.occupancyType} 
                            {option.occupancyType === 'DBL' && ' (Recommended)'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{option.roomsNeeded}</td>
                          {cwb > 0 && <td className="border border-gray-300 px-3 py-2 text-center">{option.extraBeds}</td>}
                          <td className="border border-gray-300 px-3 py-2 text-right">AED {option.hotelCost?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">AED {option.totalCostAED?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">USD {Math.round(option.totalCostUSD || 0).toLocaleString()}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-bold text-blue-600">
                            USD {Math.round(option.perPersonUSD || 0)}
                          </td>
                        </tr>
                      )) || []
                    ) || []}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                * Double occupancy (DBL) is highlighted as the most commonly selected option
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteTool;