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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuoteTool = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hotels, tours, inclusions } = useSupabaseData();

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
  const [occupancy, setOccupancy] = useState({
    single: false,
    double: true, 
    triple: false
  });
  
  // Selection states
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedInclusions, setSelectedInclusions] = useState<any[]>([]);
  const [selectedOptionalTours, setSelectedOptionalTours] = useState<any[]>([]);
  
  // Search states
  const [hotelSearch, setHotelSearch] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [inclusionSearch, setInclusionSearch] = useState('');
  
  // Generated quote and editing
  const [quoteText, setQuoteText] = useState('');
  const [editingQuote, setEditingQuote] = useState<any>(null);

  // Additional state for quote generation
  const [includeVisa, setIncludeVisa] = useState(true);
  const [includeAirportTransfer, setIncludeAirportTransfer] = useState(true);
  const [apartmentMode, setApartmentMode] = useState(false);
  const [selectedApartmentType, setSelectedApartmentType] = useState('01BR');
  const [manualTransferCost, setManualTransferCost] = useState(0);

  // Constants
  const AED_TO_USD = 3.67;
  const apartmentTypes = {
    '01BR': { adultCap: 2, cnbCap: 2, maxCWB: 1 },
    '02BR': { adultCap: 4, cnbCap: 2, maxCWB: 2 },
    '03BR': { adultCap: 6, cnbCap: 3, maxCWB: 3 }
  };

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
      
      // Set quote text from saved quote
      if (quote.formatted_quote) {
        setQuoteText(quote.formatted_quote);
      }
      
      // Clear the location state to prevent re-loading on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Calculate totals
  const totalPax = adults + cnb + cwb;
  const pax = totalPax;
  const nights = checkInDate && checkOutDate ? 
    Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Filter data based on search
  const filteredHotels = hotels.filter(hotel =>
    hotel.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
    hotel.location.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  const filteredTours = tours.filter(tour =>
    tour.name.toLowerCase().includes(tourSearch.toLowerCase()) ||
    tour.description?.toLowerCase().includes(tourSearch.toLowerCase())
  );

  const filteredInclusions = inclusions.filter(inclusion =>
    inclusion.name.toLowerCase().includes(inclusionSearch.toLowerCase()) ||
    inclusion.description?.toLowerCase().includes(inclusionSearch.toLowerCase())
  );

  // Sample inclusions data for the generateQuoteText function
  const sampleInclusions = [
    ...tours.map(t => ({ ...t, type: 'group' })),
    ...inclusions
  ];

  // Hotels array for generateQuoteText
  const hotelsArray = selectedHotel ? [{
    name: selectedHotel.name,
    rate: selectedHotel.baseRate,
    extraBed: selectedHotel.extraBedRate
  }] : [];

  // Toggle occupancy selection
  const toggleOccupancy = (type: string) => {
    setOccupancy(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Toggle tour selection
  const toggleTour = (tour: any) => {
    setSelectedTours(prev => 
      prev.some(t => t.id === tour.id)
        ? prev.filter(t => t.id !== tour.id)
        : [...prev, tour]
    );
  };

  // Toggle inclusion selection
  const toggleInclusion = (inclusion: any) => {
    setSelectedInclusions(prev => 
      prev.some(i => i.id === inclusion.id)
        ? prev.filter(i => i.id !== inclusion.id)
        : [...prev, inclusion]
    );
  };

  // Helper functions for the original generateQuoteText
  const calculateNights = (checkIn: string, checkOut: string) => {
    return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy');
  };

  const getPaxSummary = () => {
    let summary = `${adults} Adult${adults > 1 ? 's' : ''}`;
    if (cnb > 0) summary += `, ${cnb} Child${cnb > 1 ? 'ren' : ''} without bed`;
    if (cwb > 0) summary += `, ${cwb} Child${cwb > 1 ? 'ren' : ''} with bed`;
    if (infants > 0) summary += `, ${infants} Infant${infants > 1 ? 's' : ''}`;
    return summary;
  };

  const calcToursTotalPerPersonAED = () => {
    return selectedTours.reduce((total, tour) => total + (Number(tour.costPerPerson) || 0), 0);
  };

  const calcAirportTransferCostAED = () => {
    if (pax >= 1 && pax <= 5) return 250;
    if (pax >= 6 && pax <= 10) return 500;
    if (pax >= 11 && pax <= 17) return 1000;
    return 250;
  };

  const calcPerPersonUSD = (rate: number, occupancyType: string) => {
    const hotelRateAED = Number(rate || 0);
    const nights = calculateNights(checkInDate, checkOutDate);
    
    let personsPerRoom = 2; // default for double
    if (occupancyType === 'single') personsPerRoom = 1;
    if (occupancyType === 'triple') personsPerRoom = 3;
    
    const roomCostAED = hotelRateAED * nights;
    const perPersonHotelAED = roomCostAED / personsPerRoom;
    
    const visaAED = includeVisa ? 310 : 0;
    const toursAED = calcToursTotalPerPersonAED();
    const transferAED = includeAirportTransfer ? calcAirportTransferCostAED() / adults : 0;
    
    const totalAED = perPersonHotelAED + visaAED + toursAED + transferAED;
    return Math.round(totalAED / AED_TO_USD);
  };

  // Your exact generateQuoteText function
  function generateQuoteText() {
    const isSpecialDoubleOccupancy =
      (adults === cwb && adults % 2 === 0 && cnb === 0) || 
      (adults === 1 && cwb === 1 && cnb === 0);

    let roomSummaryLine = "";

    if (apartmentMode) {
      const config = apartmentTypes[selectedApartmentType];
      const capacityLeft = config.adultCap - (adults + cnb);
      const cwbsWithoutExtraBed = Math.max(0, Math.min(cwb, capacityLeft));
      const cwbsWithExtraBed = Math.max(0, cwb - cwbsWithoutExtraBed);

      const aptTitle =
        selectedApartmentType === "01BR"
          ? "01 Bedroom Apartment"
          : selectedApartmentType === "02BR"
          ? "02 Bedroom Apartment"
          : "03 Bedroom Apartment";

      roomSummaryLine = `<p><strong>Room Type:</strong> ${aptTitle}${
        cwbsWithExtraBed > 0 ? ` + ${cwbsWithExtraBed} Extra Bed` : ""
      }</p>`;
    }

    if (nights === 0) {
      alert("Please select valid check-in and check-out dates.");
      return;
    }
    if (pax < 1) {
      alert("Number of pax must be at least 1.");
      return;
    }
    if (!apartmentMode && !occupancy.single && !occupancy.double && !occupancy.triple) {
      alert("Please select at least one occupancy type");
      return;
    }

    if (hotelsArray.length === 0 || hotelsArray.some((h) => !h.name || !h.rate)) {
      alert("Please enter at least one hotel with name and rate.");
      return;
    }

    let infantCostLine = "";
    if (infants > 0) {
      const visaUSD = 20;
      const totalUSD = visaUSD;
      infantCostLine = `<p><strong>Infant Cost:</strong> USD ${totalUSD} per infant (for visa only)</p>`;
    }

    let hotelTable = `
  <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 800px; font-size: 11px;">
    <tr>
      <td><strong>${apartmentMode ? "Apartment Name" : "Hotel Name"}</strong></td>
      ${
        apartmentMode
          ? `
            ${adults > 0 ? `<td><strong>Adult Price</strong></td>` : ""}
            ${cwb > 0 ? `<td><strong>Child with Bed</strong></td>` : ""}
            ${cnb > 0 ? `<td><strong>Child without Bed</strong></td>` : ""}

          `
          :isSpecialDoubleOccupancy
          ? `
            <td style="padding: 4px;"><strong>Adult Price (Double Occupancy)</strong></td>
            <td style="padding: 4px;"><strong>Child Price (Double Occupancy)</strong></td>
          `
          : `
            ${
              occupancy.double
                ? `<td style="padding: 4px;"><strong>Adult Price (Double Occupancy)</strong></td>`
                : ""
            }
            ${
              occupancy.single
                ? `<td style="padding: 4px;"><strong>Adult Price (Single Occupancy)</strong></td>`
                : ""
            }
            ${
              occupancy.triple
                ? `<td style="padding: 4px;"><strong>Adult Price (Triple Occupancy)</strong></td>`
                : ""
            }
            ${
              cwb > 0
                ? `<td style="padding: 4px;"><strong>Price (Child with Bed)</strong></td>`
                : ""
            }
            ${
              cnb > 0
                ? `<td style="padding: 4px;"><strong>Price (Child without Bed)</strong></td>`
                : ""
            }
          `
      }
    </tr>
    <tbody>
`;

    hotelsArray.forEach((hotel) => {
      let quoteHTML = ""; // Initialize the HTML for the quote

      const { name, rate, extraBed } = hotel;
      const nights = calculateNights(checkInDate, checkOutDate);
      const hotelRateAED = Number(rate || 0);

      hotelTable += `<tr><td style="padding: 4px;">${name}</td>`;

      const visaAdult = includeVisa ? 310 / AED_TO_USD : 0;
      const visaChild = includeVisa ? 20 : 0;
      const toursUSD = calcToursTotalPerPersonAED() / AED_TO_USD;
      const airportTransferPerAdult = includeAirportTransfer
        ? (manualTransferCost || calcAirportTransferCostAED()) / adults / AED_TO_USD
        : 0;

      if (apartmentMode) {
        const config = apartmentTypes[selectedApartmentType]; // { adultCap, cnbCap, maxCWB }
        const totalCostAED = hotelRateAED * nights;

        // ➤ Determine how many CWBs can use existing beds
        const capacityLeft = config.adultCap - (adults + cnb);
        const cwbsWithoutExtraBed = Math.max(0, Math.min(cwb, capacityLeft));
        const cwbsWithExtraBed = Math.max(0, cwb - cwbsWithoutExtraBed);

        // ➤ Cost division among adults + CWBs without extra bed
        const totalPaxForSplit = adults + cwbsWithoutExtraBed;
        const perPersonAptCostUSD = totalPaxForSplit > 0
          ? totalCostAED / totalPaxForSplit / AED_TO_USD
          : 0;

        // ✅ Adult row
        if (adults > 0) {
          const adultTotal = Math.round(
            perPersonAptCostUSD + visaAdult + toursUSD + airportTransferPerAdult
          );
          hotelTable += `<td style="padding: 4px;">USD ${adultTotal} per person</td>`;
        }

        // ✅ CWB row
        if (cwb > 0) {
          const extraBedCostUSD = (Number(extraBed || 0) * nights) / AED_TO_USD;

          let cwbTotal = 0;

          if (cwbsWithExtraBed > 0) {
            // Mix of with and without extra bed — show average
            const costWithout = perPersonAptCostUSD + visaChild + toursUSD;
            const costWith = extraBedCostUSD + visaChild + toursUSD;
            const total = (costWith * cwbsWithExtraBed + costWithout * cwbsWithoutExtraBed) / cwb;
            cwbTotal = Math.round(total);
          } else {
            cwbTotal = Math.round(perPersonAptCostUSD + visaChild + toursUSD);
          }

          hotelTable += `<td style="padding: 4px;">USD ${cwbTotal} per person</td>`;
        }

        // ✅ CNB row
        if (cnb > 0) {
          const cnbTotal = Math.round(visaChild + toursUSD);
          hotelTable += `<td style="padding: 4px;">USD ${cnbTotal} per person</td>`;
        }

        // ✅ Room Summary
        const aptTitle =
          selectedApartmentType === "01BR"
            ? "01 Bedroom Apartment"
            : selectedApartmentType === "02BR"
            ? "02 Bedroom Apartment"
            : "03 Bedroom Apartment";

        const extraBedsUsed = cwbsWithExtraBed;

        quoteHTML += `<p><strong>${aptTitle}${
          extraBedsUsed > 0 ? ` + ${extraBedsUsed} Extra Bed` : ""
        }</strong></p>`;
      }
      else if (isSpecialDoubleOccupancy) {
        // 🏨 Shared Room Hotel Logic
        const totalHotelCostAED = hotelRateAED * nights;
        const sharedHotelCostAED = totalHotelCostAED / 2;
        const sharedHotelCostUSD = sharedHotelCostAED / AED_TO_USD;

        const adultTotalUSD = Math.round(
          sharedHotelCostUSD + visaAdult + toursUSD + airportTransferPerAdult
        );
        const cwbTotalUSD = Math.round(
          sharedHotelCostUSD + visaChild + toursUSD
        );

        hotelTable += `
          <td style="padding: 4px;">USD ${adultTotalUSD} per person with BB</td>
          <td style="padding: 4px;">USD ${cwbTotalUSD} per person with BB</td>
        `;
      } else {
        // 🏨 Normal Hotel Room Logic
        if (occupancy.double) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            rate,
            "double"
          )} per person with BB</td>`;
        }
        if (occupancy.single) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            rate,
            "single"
          )} per person with BB</td>`;
        }
        if (occupancy.triple) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            rate,
            "triple"
          )} per person with BB</td>`;
        }

        if (cwb > 0) {
          const extraBedCostAED = Number(extraBed || 0);
          const extraBedCostUSD = (extraBedCostAED * nights) / AED_TO_USD;
          const totalCwbCostUSD = Math.round(
            extraBedCostUSD + toursUSD + visaChild
          );
          hotelTable += `<td style="padding: 4px;">USD ${totalCwbCostUSD} per person with BB</td>`;
        }

        if (cnb > 0) {
          const totalUSD = Math.round(visaChild + toursUSD);
          hotelTable += `<td style="padding: 4px;">USD ${totalUSD} per person</td>`;
        }
      }

      hotelTable += `</tr>`;
    });

    hotelTable += `</tbody></table>`;

    // Generate bullet list for tours
    const tdIncluded = true; // Default to true for now

    const toursLines = selectedTours
      .map((tour) => {
        if (!tour) return "";
        return `<li>${tour.name}</li>`;
      })
      .join("");

    const optionalToursLines = selectedOptionalTours
      .map((tour) => {
        const baseAED = Number(tour.priceAED || 0);
        const transferAED = Number(tour.transferCost || 0);
        const perPersonTransferAED = totalPax > 0 ? transferAED / totalPax : 0;

        const totalAED = baseAED + perPersonTransferAED;
        const priceUSD = Math.ceil(totalAED / AED_TO_USD);

        return `<li>${tour.name} @ USD ${priceUSD} per person</li>`;
      })
      .join("");

    const visaLine = includeVisa ? `<li>Dubai Tourist Visa Fees</li>` : "";
    let airportTransferLine = "";
    if (includeAirportTransfer) {
      // Calculate airport transfer price based on pax count (assuming pax is defined)
      let transferPrice = 0;
      if (pax >= 1 && pax <= 5) transferPrice = 250;
      else if (pax >= 6 && pax <= 10) transferPrice = 500;
      else if (pax >= 11 && pax <= 17) transferPrice = 1000;

      airportTransferLine = `<li>Private Return Airport Transfers (Dubai International Airport Terminal 1, 2, or 3)</li>`;
    }

    const taxLine = tdIncluded
      ? `<li>All taxes <span style="color: red; font-weight: bold;">Including</span> Tourism Dirham</li>`
      : `<li>All taxes except Tourism Dirham</li>`;

    const hasTour = selectedTours.length > 0;
    const hasPrivateTour = selectedTours.some((tour) => {
      const fullTour = sampleInclusions.find((t) => t.id === tour.id);
      return fullTour?.type === "private";
    });

    const transferLine = hasTour
      ? hasPrivateTour
        ? `<li>All transfers are on a SIC basis, except where specified as private transfers.</li>`
        : `<li>All transfers on a SIC basis</li>`
      : "";

    const inclusionsText = `
  <ul class="list-disc list-inside space-y-1">
    <li><strong>${nights < 10 ? "0" + nights : nights}</strong> Night${
      nights > 1 ? "'s" : ""
    } accommodation in above specified hotel(s)</li>
    <li>Daily Breakfast</li>
    ${toursLines}
    ${visaLine}
    ${airportTransferLine}
    ${transferLine}
    ${taxLine}
  </ul>
`.trim();

    const optionalToursText = optionalToursLines
      ? `<strong><u>Optional Cost:</u></strong><br /><br /><ul class="list-disc list-inside space-y-1">${optionalToursLines}</ul>`
      : "";

    const checkInText = formatDate(checkInDate);
    const checkOutText = formatDate(checkOutDate);

    const paxText = pax > 1 ? `${pax} persons` : "1 person";

    // Compose the full quote HTML string
    const fullQuote = `
    <div style="font-family: Arial, sans-serif; line-height: 1.3; font-size: 13px;">
      Dear Partner,<br /><br />

      Greetings for the day…!!!<br /><br />

      Pleased to quote you as below :<br /><br />

      Kindly check the rate / hotel availability with us when your client is ready to book<br /><br />

      <strong>No of Pax:</strong> ${getPaxSummary()}<br />
      <strong>Check-in:</strong> ${formatDate(checkInDate)}<br />
      <strong>Check-out:</strong> ${formatDate(checkOutDate)}<br />

        ${roomSummaryLine} 

       ${infantCostLine} <br />

      ${hotelTable}<br /><br />

<strong><u>Inclusions:</u></strong><br /><br />
      ${inclusionsText}<br /><br />
      ${optionalToursText}<br /><br />

      <strong>Note: Rates and rooms are subject to change at the time of confirmation. / Rates quoted are fully nonrefundable</strong><br /><br />

      Should you need any clarifications on the above or require further assistance, please feel free to contact me at any time.<br />
      Looking forward to your earliest reply...<br /><br />

      <em style="color: red;">
        Note: As per the Dubai Executive Council Resolution No. (2) of 2014, a "Tourism Dirham (TD)" charge of AED 10 to AED 20 per room per night (depending on the Hotel Classification category) will apply for hotel rooms and Suites. For Apartments, charges apply.
      </em><br /><br /><br />


    </div>
  `;

    setQuoteText(fullQuote);
  }

  // Calculate quote
  const calculateQuote = () => {
    if (!selectedHotel || !customerName || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!occupancy.single && !occupancy.double && !occupancy.triple) {
      toast({
        title: "Missing Occupancy",
        description: "Please select at least one occupancy type",
        variant: "destructive"
      });
      return;
    }

    generateQuoteText();
  };

  // Copy formatted text
  const copyFormattedText = () => {
    if (quoteText) {
      // Strip HTML tags for plain text copy
      const textContent = quoteText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      navigator.clipboard.writeText(textContent);
      toast({ title: "Copied!", description: "Quote text copied to clipboard" });
    }
  };

  // Download PDF
  const downloadPDF = () => {
    if (!quoteText) return;

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #b8860b; text-align: center; margin-bottom: 30px;">DUBAI TOUR PACKAGE QUOTE</h1>
        <div style="white-space: pre-line; font-size: 14px;">${quoteText}</div>
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
    if (!quoteText) {
      toast({
        title: "No Quote Generated",
        description: "Please generate a quote first",
        variant: "destructive"
      });
      return;
    }

    try {
      const baseRate = Number(selectedHotel?.baseRate || 0);
      const totalCostAED = (baseRate * nights) + 
        (selectedTours.reduce((sum, tour) => sum + (Number(tour.costPerPerson) || 0) * totalPax, 0)) +
        (selectedInclusions.reduce((sum, inc) => sum + (Number(inc.cost) || 0) * totalPax, 0));

      if (editingQuote) {
        // Update existing quote
        const updateData = {
          client_name: customerName,
          client_email: customerEmail,
          travel_dates_from: checkInDate,
          travel_dates_to: checkOutDate,
          adults,
          infants,
          cnb,
          cwb,
          total_amount: totalCostAED,
          currency: 'AED',
          status: 'draft',
          formatted_quote: quoteText,
          notes: `Selected Hotel: ${selectedHotel?.name || 'N/A'}\nTours: ${selectedTours.map(t => t.name).join(', ')}\nInclusions: ${selectedInclusions.map(i => i.name).join(', ')}`
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
        // Create new quote
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
          total_amount: totalCostAED,
          currency: 'AED',
          status: 'draft',
          formatted_quote: quoteText,
          notes: `Selected Hotel: ${selectedHotel?.name || 'N/A'}\nTours: ${selectedTours.map(t => t.name).join(', ')}\nInclusions: ${selectedInclusions.map(i => i.name).join(', ')}`
        };
        
        const { error } = await supabase
          .from('quotes')
          .insert(insertData);
          
        if (error) throw error;
        toast({
          title: "Quote Saved",
          description: "Quote has been saved successfully"
        });
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calculator className="mr-3 h-8 w-8 text-dubai-gold" />
            Quote Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate professional travel quotes with detailed pricing and inclusions
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/quotes')}
          className="dubai-button-secondary"
        >
          View All Quotes
        </Button>
      </div>

      {/* Customer Information */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="dubai-input"
              />
            </div>
            <div>
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter customer email"
                className="dubai-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Travel Details */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Travel Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Travel Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="check-in">Check-in Date *</Label>
              <Input
                id="check-in"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="dubai-input"
              />
            </div>
            <div>
              <Label htmlFor="check-out">Check-out Date *</Label>
              <Input
                id="check-out"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="dubai-input"
              />
            </div>
          </div>

          {/* Passenger Information */}
          <div>
            <Label className="text-base font-semibold">Passenger Details</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <Label htmlFor="adults" className="text-sm">Adults</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    disabled={adults <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center dubai-input"
                  />
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
                <Label htmlFor="infants" className="text-sm">Infants</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInfants(Math.max(0, infants - 1))}
                    disabled={infants <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="infants"
                    type="number"
                    min="0"
                    value={infants}
                    onChange={(e) => setInfants(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center dubai-input"
                  />
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
                <Label htmlFor="cnb" className="text-sm">CNB</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCnb(Math.max(0, cnb - 1))}
                    disabled={cnb <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="cnb"
                    type="number"
                    min="0"
                    value={cnb}
                    onChange={(e) => setCnb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center dubai-input"
                  />
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
                <Label htmlFor="cwb" className="text-sm">CWB</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCwb(Math.max(0, cwb - 1))}
                    disabled={cwb <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="cwb"
                    type="number"
                    min="0"
                    value={cwb}
                    onChange={(e) => setCwb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center dubai-input"
                  />
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
          </div>

          {/* Total Passengers */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium">
              Total Passengers: {totalPax} • Nights: {nights}
            </p>
          </div>

          {/* Occupancy Selection */}
          <div>
            <Label className="text-base font-semibold">Room Occupancy Types *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which occupancy columns to show in the quote (select at least one)
            </p>
            {/* Occupancy Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="occupancy-single"
                  checked={occupancy.single}
                  onCheckedChange={() => toggleOccupancy('single')}
                />
                <div className="flex-1">
                  <Label htmlFor="occupancy-single" className="text-sm font-medium cursor-pointer">
                    Single Occupancy
                  </Label>
                  <p className="text-xs text-muted-foreground">One person per room</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="occupancy-double"
                  checked={occupancy.double}
                  onCheckedChange={() => toggleOccupancy('double')}
                />
                <div className="flex-1">
                  <Label htmlFor="occupancy-double" className="text-sm font-medium cursor-pointer">
                    Double Occupancy
                  </Label>
                  <p className="text-xs text-muted-foreground">Two people per room</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id="occupancy-triple"
                  checked={occupancy.triple}
                  onCheckedChange={() => toggleOccupancy('triple')}
                />
                <div className="flex-1">
                  <Label htmlFor="occupancy-triple" className="text-sm font-medium cursor-pointer">
                    Triple Occupancy
                  </Label>
                  <p className="text-xs text-muted-foreground">Three people per room</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel Selection */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Hotel Selection *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Hotel Display */}
          {selectedHotel && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{selectedHotel.name}</h4>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {selectedHotel.location}
                  </p>
                  <p className="text-sm">
                    Base Rate: AED {selectedHotel.baseRate}/night
                    {cwb > 0 && ` • Extra Bed: AED ${selectedHotel.extraBedRate}/night`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedHotel(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {/* Hotel Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              placeholder="Search for hotels..."
              className="pl-10 dubai-input"
            />
          </div>

          {/* Available Hotels */}
          {!selectedHotel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {filteredHotels.map(hotel => (
                <div 
                  key={hotel.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedHotel(hotel)}
                >
                  <div>
                    <p className="font-medium">{hotel.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {hotel.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AED {hotel.baseRate}/night
                      {cwb > 0 && ` • Extra Bed: AED ${hotel.extraBedRate}/night`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Select
                  </Button>
                </div>
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
        </CardContent>
      </Card>

      {/* Tours Selection */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Tours & Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Tours Display */}
          {selectedTours.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Tours:</Label>
              {selectedTours.map((tour, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{tour.name}</p>
                    <p className="text-xs text-muted-foreground">
                    AED {tour.costPerPerson}/person × {totalPax} pax = AED {(tour.costPerPerson * totalPax).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleTour(tour)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Tour Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={tourSearch}
              onChange={(e) => setTourSearch(e.target.value)}
              placeholder="Search for tours and activities..."
              className="pl-10 dubai-input"
            />
          </div>

          {/* Available Tours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
            {filteredTours.map(tour => (
              <div 
                key={tour.id}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  selectedTours.some(t => t.id === tour.id) ? 'bg-primary/10 border-primary' : ''
                }`}
                onClick={() => toggleTour(tour)}
              >
                <Checkbox
                  checked={selectedTours.some(t => t.id === tour.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{tour.name}</p>
                    <p className="text-xs text-muted-foreground">
                      AED {tour.costPerPerson}/person × {totalPax} pax = AED {(tour.costPerPerson * totalPax).toLocaleString()}
                    </p>
                </div>
              </div>
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
        </CardContent>
      </Card>

      {/* Additional Services */}
      <Card className="dubai-card">
        <CardHeader>
          <CardTitle>Additional Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Inclusions Display */}
          {selectedInclusions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected Services:</Label>
              {selectedInclusions.map((inclusion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{inclusion.name}</p>
                    <p className="text-xs text-muted-foreground">
                      AED {inclusion.cost}/person × {totalPax} pax = AED {(inclusion.cost * totalPax).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleInclusion(inclusion)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Inclusion Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inclusionSearch}
              onChange={(e) => setInclusionSearch(e.target.value)}
              placeholder="Search for additional services..."
              className="pl-10 dubai-input"
            />
          </div>
          
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
        </CardContent>
      </Card>

      {/* Generate Quote Button */}
      <div className="flex justify-center">
        <Button 
          onClick={calculateQuote}
          className="dubai-button-primary"
          disabled={!selectedHotel || !customerName || !checkInDate || !checkOutDate || (!occupancy.single && !occupancy.double && !occupancy.triple)}
        >
          <Calculator className="mr-2 h-4 w-4" />
          Generate Quote
        </Button>
      </div>

      {/* Generated Quote */}
      {quoteText && (
        <Card className="dubai-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Quote</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyFormattedText}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
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
            <div id="quote-content" className="bg-white rounded-lg shadow-sm border p-6">
              <ReactQuill
                value={quoteText}
                readOnly={true}
                theme="bubble"
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  fontSize: '14px'
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteTool;