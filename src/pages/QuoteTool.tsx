import React, { useState, useMemo } from "react";
import html2pdf from "html2pdf.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, Calculator, Save, Minus, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { useAppContext } from '../context/AppContext';
import { toast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const AED_TO_USD = 3.65;

// Format date like 31st May 2025
function formatDate(date: string) {
  if (!date) return "";

  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();

  const dayNumber = parseInt(day, 10);
  const suffix =
    dayNumber === 1 || dayNumber === 21 || dayNumber === 31
      ? "st"
      : dayNumber === 2 || dayNumber === 22
      ? "nd"
      : dayNumber === 3 || dayNumber === 23
      ? "rd"
      : "th";

  return `${day}${suffix} ${month} ${year}`;
}

interface TourSelectorProps {
  tours: any[];
  selected: any[];
  onChange: (tours: any[]) => void;
}

function TourSelector({ tours, selected, onChange }: TourSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredTours = tours.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (id: string) => selected.some((t) => t.id === id);

  const handleToggle = (tour: any) => {
    if (isSelected(tour.id)) {
      onChange(selected.filter((t) => t.id !== tour.id));
    } else {
      onChange([...selected, { ...tour, transferCost: "" }]);
    }
  };

  const handleTransferChange = (id: string, value: string) => {
    onChange(
      selected.map((t) =>
        t.id === id ? { ...t, transferCost: value } : t
      )
    );
  };

  return (
    <div className="relative w-full text-xs">
      <Input
        type="text"
        placeholder="Search and select inclusions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-xs"
      />

      {search && (
        <div className="absolute z-50 bg-white border border-primary rounded-md max-h-40 overflow-y-auto w-full mt-1 shadow-lg">
          {filteredTours.length ? (
            filteredTours.map((tour) => {
              const selectedTour = selected.find((t) => t.id === tour.id);
              return (
                <div key={tour.id} className="p-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!selectedTour}
                      onChange={() => handleToggle(tour)}
                    />
                    <span>
                      {tour.name} (AED {tour.cost_per_person || tour.cost})
                    </span>
                    {tour.type === "private" && selectedTour && (
                      <Input
                        type="number"
                        placeholder="Transfer AED"
                        value={selectedTour.transferCost || ""}
                        onChange={(e) =>
                          handleTransferChange(tour.id, e.target.value)
                        }
                        className="w-20 h-6 text-xs"
                      />
                    )}
                  </label>
                </div>
              );
            })
          ) : (
            <div className="p-2 text-gray-500 italic text-xs">
              No tours found
            </div>
          )}
        </div>
      )}

      {!search && selected.length > 0 && (
        <div className="mt-2 text-xs text-primary max-h-15 overflow-y-auto border border-primary rounded p-2">
          {selected.map((t) => t.name).join(", ")}
        </div>
      )}
    </div>
  );
}

function HotelSelector({ hotels, selectedHotel, onChange }: { 
  hotels: any[], 
  selectedHotel: any | null, 
  onChange: (hotel: any) => void 
}) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredHotels = hotels.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (hotel: any) => {
    onChange(hotel);
    setSearch("");
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="Search and select hotel..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className="text-sm"
      />

      {showDropdown && search && (
        <div className="absolute z-50 bg-white border border-primary rounded-md max-h-40 overflow-y-auto w-full mt-1 shadow-lg">
          {filteredHotels.length ? (
            filteredHotels.map((hotel) => (
              <div 
                key={hotel.id} 
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleSelect(hotel)}
              >
                <div>{hotel.name}</div>
                <div className="text-xs text-gray-500">
                  {hotel.location} - {hotel.starRating}★ - AED {hotel.baseRate}/night
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500 italic text-sm">
              No hotels found
            </div>
          )}
        </div>
      )}

      {selectedHotel && !search && (
        <div className="mt-2 p-2 border border-primary rounded text-sm">
          <div className="font-medium">{selectedHotel.name}</div>
          <div className="text-xs text-gray-600">
            {selectedHotel.location} - {selectedHotel.starRating}★ - AED {selectedHotel.baseRate}/night
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuoteTool() {
  const { state, addQuote } = useAppContext();
  const navigate = useNavigate();
  const { hotels, tours, inclusions } = state;

  // State variables from original app.js
  const [apartmentMode, setApartmentMode] = useState(false);
  const [selectedApartmentType, setSelectedApartmentType] = useState("01BR");
  
  const apartmentTypes = {
    "01BR": { adultCap: 2, cnbCap: 1, maxCWB: 1 },
    "02BR": { adultCap: 4, cnbCap: 2, maxCWB: 2 },
    "03BR": { adultCap: 6, cnbCap: 3, maxCWB: 3 },
  };

  const [adults, setAdults] = useState(1);
  const [infants, setInfants] = useState(0);
  const [cnb, setCnb] = useState(0);
  const [cwb, setCwb] = useState(0);
  const [includeVisa, setIncludeVisa] = useState(false);
  const [includeAirportTransfer, setIncludeAirportTransfer] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  let pax = adults + cwb + cnb + infants;

  const [occupancy, setOccupancy] = useState({
    single: false,
    double: false,
    triple: false,
  });

  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [hotelRate, setHotelRate] = useState("");
  const [extraBedRate, setExtraBedRate] = useState("");
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [quoteText, setQuoteText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [manualTransferCost, setManualTransferCost] = useState("");

  const isSpecialDoubleOccupancy =
    (adults === cwb && adults % 2 === 0 && cnb === 0) || 
    (adults === 1 && cwb === 1 && cnb === 0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diff > 0 ? diff / (1000 * 60 * 60 * 24) : 0;
  }, [checkIn, checkOut]);

  // Calculation functions from original app.js
  function calcHotelCostPerPersonAED(rate: number, occupancyType: string) {
    if (!rate || nights === 0) return 0;

    let divisor = 1;
    if (occupancyType === "double") divisor = 2;
    else if (occupancyType === "triple") divisor = 3;

    return Math.ceil((rate * nights) / divisor);
  }

  function calcAirportTransferCostAED() {
    if (!includeAirportTransfer) return 0;

    const manualCost = Number(manualTransferCost);
    if (!isNaN(manualCost) && manualCost > 0) {
      return manualCost;
    }

    if (pax >= 1 && pax <= 5) return 250;
    if (pax >= 6 && pax <= 10) return 500;
    if (pax >= 11 && pax <= 17) return 1000;
    return 0;
  }

  function calcToursTotalPerPersonAED() {
    const paxCount = adults + cnb + cwb;

    return selectedTours.reduce((sum, tour) => {
      const basePrice = Number(tour.cost_per_person || tour.costPerPerson) || 0;
      const transferCost = tour.type === "private" && tour.transferCost
        ? Number(tour.transferCost) / paxCount
        : 0;
      return sum + basePrice + transferCost;
    }, 0);
  }

  function calcTotalPerPersonAED(rate: number, occupancyType: string) {
    const hotelCost = calcHotelCostPerPersonAED(rate, occupancyType);
    const tourCost = calcToursTotalPerPersonAED();

    let total = hotelCost + tourCost;

    if (includeVisa) {
      total += 310;
    }

    if (includeAirportTransfer) {
      const airportTransferTotal = calcAirportTransferCostAED();
      const paxForTransfer = adults;
      const airportTransferPerPerson =
        paxForTransfer > 0 ? airportTransferTotal / paxForTransfer : 0;
      total += airportTransferPerPerson;
    }

    return Math.ceil(total);
  }

  function calcPerPersonUSD(rate: number, occupancyType: string) {
    const totalAED = calcTotalPerPersonAED(rate, occupancyType);
    return Math.ceil(totalAED / AED_TO_USD);
  }

  function getPaxSummary() {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
    if (cwb > 0) parts.push(`${cwb} Child (06 to 17 Years)`);
    if (cnb > 0) parts.push(`${cnb} Child (03 to 05 Years)`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? "s" : ""}`);
    return parts.join(" + ");
  }

  // Convert backend data to match expected format
  const convertedTours = tours.map(tour => ({
    id: tour.id,
    name: tour.name,
    cost_per_person: tour.costPerPerson,
    costPerPerson: tour.costPerPerson,
    type: tour.type,
    priceAED: tour.costPerPerson,
  }));

  const convertedInclusions = inclusions.map(inclusion => ({
    id: inclusion.id,
    name: inclusion.name,
    cost: inclusion.cost,
    cost_per_person: inclusion.cost,
    type: inclusion.type === "visa" ? "visa" : "sharing",
    priceAED: inclusion.cost,
  }));

  const allAvailableInclusions = [...convertedTours, ...convertedInclusions];

  // Generate quote text with original logic
  function generateQuoteText() {
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
    if (!selectedHotel || !hotelRate) {
      alert("Please select a hotel and enter the rate.");
      return;
    }

    let roomSummaryLine = "";
    let infantCostLine = "";

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

    if (infants > 0) {
      const visaUSD = 20;
      const totalUSD = visaUSD;
      infantCostLine = `<p><strong>Infant Cost:</strong> USD ${totalUSD} per infant (for visa only)</p>`;
    }

    // Generate hotel table HTML (keeping original complex logic)
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
          : isSpecialDoubleOccupancy
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
    <tbody>`;

    const rate = Number(hotelRate);
    const extraBed = Number(extraBedRate || 0);
    
    hotelTable += `<tr><td style="padding: 4px;">${selectedHotel.name}</td>`;

    const visaAdult = includeVisa ? 310 / AED_TO_USD : 0;
    const visaChild = includeVisa ? 20 : 0;
    const toursUSD = calcToursTotalPerPersonAED() / AED_TO_USD;
    const airportTransferPerAdult = includeAirportTransfer
      ? calcAirportTransferCostAED() / adults / AED_TO_USD
      : 0;

    if (apartmentMode) {
      const config = apartmentTypes[selectedApartmentType];
      const totalCostAED = rate * nights;
      const capacityLeft = config.adultCap - (adults + cnb);
      const cwbsWithoutExtraBed = Math.max(0, Math.min(cwb, capacityLeft));
      const cwbsWithExtraBed = Math.max(0, cwb - cwbsWithoutExtraBed);
      const totalPaxForSplit = adults + cwbsWithoutExtraBed;
      const perPersonAptCostUSD = totalPaxForSplit > 0
        ? totalCostAED / totalPaxForSplit / AED_TO_USD
        : 0;

      if (adults > 0) {
        const adultTotal = Math.round(
          perPersonAptCostUSD + visaAdult + toursUSD + airportTransferPerAdult
        );
        hotelTable += `<td style="padding: 4px;">USD ${adultTotal} per person</td>`;
      }

      if (cwb > 0) {
        const extraBedCostUSD = (extraBed * nights) / AED_TO_USD;
        let cwbTotal = 0;

        if (cwbsWithExtraBed > 0) {
          const costWithout = perPersonAptCostUSD + visaChild + toursUSD;
          const costWith = extraBedCostUSD + visaChild + toursUSD;
          const total = (costWith * cwbsWithExtraBed + costWithout * cwbsWithoutExtraBed) / cwb;
          cwbTotal = Math.round(total);
        } else {
          cwbTotal = Math.round(perPersonAptCostUSD + visaChild + toursUSD);
        }

        hotelTable += `<td style="padding: 4px;">USD ${cwbTotal} per person</td>`;
      }

      if (cnb > 0) {
        const cnbTotal = Math.round(visaChild + toursUSD);
        hotelTable += `<td style="padding: 4px;">USD ${cnbTotal} per person</td>`;
      }
    } else if (isSpecialDoubleOccupancy) {
      const totalHotelCostAED = rate * nights;
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
        const extraBedCostUSD = (extraBed * nights) / AED_TO_USD;
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

    hotelTable += `</tr></tbody></table>`;

    // Tours list
    const toursLines = selectedTours
      .map((tour) => {
        if (!tour) return "";
        return `<li>${tour.name}</li>`;
      })
      .join("");

    // Generate final quote HTML
    const quoteHTML = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 12px; line-height: 1.4;">
  <h2 style="color: #E12677; text-align: center; margin-bottom: 20px;">Dubai Travel Package Quote</h2>
  
  <p><strong>Travel Dates:</strong> ${formatDate(checkIn)} to ${formatDate(checkOut)} (${nights} nights)</p>
  <p><strong>Number of Pax:</strong> ${getPaxSummary()}</p>
  ${roomSummaryLine}
  
  ${hotelTable}
  
  ${toursLines ? `<p><strong>Tours & Activities Included:</strong></p><ul>${toursLines}</ul>` : ""}
  
  ${includeVisa ? '<p><strong>Visa:</strong> Dubai Tourist Visa included</p>' : ''}
  ${includeAirportTransfer ? '<p><strong>Airport Transfer:</strong> Round trip transfers included</p>' : ''}
  
  ${infantCostLine}
  
  <p style="margin-top: 20px; font-style: italic; font-size: 10px;">
    All prices are per person and subject to availability. Terms and conditions apply.
  </p>
</div>`;

    setQuoteText(quoteHTML);
  }

  // Copy functions from original app.js
  const copyFormattedText = () => {
    if (!quoteText) {
      alert("Please generate a quote first");
      return;
    }
    
    const stripHtml = (html: string) => {
      const tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    };
    
    const plainText = stripHtml(quoteText);
    navigator.clipboard.writeText(plainText);
    alert("Formatted quote copied to clipboard!");
  };

  const downloadPDF = () => {
    if (!quoteText) {
      alert("Please generate a quote first");
      return;
    }

    const element = document.createElement('div');
    element.innerHTML = quoteText;
    
    const opt = {
      margin: 1,
      filename: `quote-${customerName || 'customer'}-${Date.now()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const copyBreakdown = () => {
    if (!selectedHotel || !hotelRate) {
      alert("Please select hotel and enter rate first");
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const numberOfNights = nights;

    const checkInFormatted = checkInDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    const checkOutFormatted = checkOutDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    let summaryText = `${checkInFormatted} - ${checkOutFormatted}\n`;
    summaryText += `${numberOfNights < 10 ? "0" + numberOfNights : numberOfNights} Nights\n`;

    let paxText = `${adults} Adults`;
    if (cnb > 0) paxText += ` + ${cnb} Child (03 to 05 Years)`;
    if (cwb > 0) paxText += ` + ${cwb} Child (06 to 17 Years)`;
    summaryText += `${paxText}\n\n`;

    // Hotel info
    const hasCWB = cwb > 0;
    const showExtraBed = hasCWB && !isSpecialDoubleOccupancy;
    
    if (showExtraBed) {
      summaryText += `${selectedHotel.name} - ${hotelRate} sell | ${extraBedRate || 0} EB\n`;
    } else {
      summaryText += `${selectedHotel.name} - ${hotelRate} sell\n`;
    }

    summaryText += `\n`;

    // Tours
    let tourTotalPerPerson = 0;
    const totalPaxForSharing = adults + cwb + cnb;

    selectedTours.forEach((tour) => {
      const tourPriceAED = Number(tour.cost_per_person || tour.costPerPerson) || 0;
      const transferCost = Number(tour.transferCost || 0);
      const transferPerPerson = tour.type === "private" ? transferCost / totalPaxForSharing : 0;
      const totalPerPersonAED = tourPriceAED + transferPerPerson;

      summaryText += `${tour.name} - ${Math.round(totalPerPersonAED)}\n`;
      tourTotalPerPerson += totalPerPersonAED;
    });

    // Visa
    if (includeVisa) {
      summaryText += `Visa - 310`;
      if (cnb > 0 || cwb > 0) summaryText += `, 73`;
      summaryText += `\n`;
    }

    // Airport Transfer
    let perPersonAT = 0;
    if (includeAirportTransfer) {
      const airportTransferTotal = calcAirportTransferCostAED();
      const paxForSharing = adults;
      if (paxForSharing > 0) {
        perPersonAT = airportTransferTotal / paxForSharing;
        summaryText += `AT (per person) - ${Math.round(perPersonAT)}\n`;
      }
    }

    // Calculate totals
    const adultTotal = Math.round(
      tourTotalPerPerson + (includeVisa ? 310 : 0) + perPersonAT
    );

    let childTotal = 0;
    if (cnb + cwb > 0) {
      childTotal = tourTotalPerPerson;
      if (includeVisa) childTotal += 73;
      childTotal = Math.round(childTotal);
    }

    summaryText += `Total - ${adultTotal}`;
    if (childTotal > 0) {
      summaryText += `/${childTotal}`;
    }

    navigator.clipboard.writeText(summaryText);
    alert("Quote Breakdown copied to clipboard!");
  };

  async function saveQuote() {
    if (!customerName || !checkIn || !checkOut || !selectedHotel) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name, travel dates, and select a hotel.",
        variant: "destructive",
      });
      return;
    }

    try {
      const hotelCost = Number(hotelRate) * nights;
      const toursCost = calcToursTotalPerPersonAED() * (adults + cwb + cnb);
      const inclusionsCost = (includeVisa ? 310 * adults + 73 * (cwb + cnb) : 0) +
                           (includeAirportTransfer ? calcAirportTransferCostAED() : 0);
      
      const calculations = {
        hotelCost,
        toursCost,
        inclusionsCost,
        totalCostAED: hotelCost + toursCost + inclusionsCost,
        totalCostUSD: (hotelCost + toursCost + inclusionsCost) / AED_TO_USD,
        exchangeRate: AED_TO_USD,
      };

      const newQuote = {
        ticketReference: `QT-${Date.now()}`,
        customerName,
        customerEmail,
        travelDates: {
          startDate: checkIn,
          endDate: checkOut
        },
        paxDetails: {
          adults,
          infants,
          cnb,
          cwb
        },
        selectedHotel: {
          id: selectedHotel.id,
          name: selectedHotel.name,
          location: selectedHotel.location,
          starRating: selectedHotel.starRating,
          baseRate: Number(hotelRate)
        },
        selectedTours: selectedTours,
        selectedInclusions: [],
        calculations,
        status: 'draft' as const,
        createdBy: state.user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        formattedQuote: quoteText
      };

      await addQuote(newQuote);
      
      toast({
        title: "Quote Saved",
        description: "Quote has been saved successfully!",
      });

      navigate('/quotes');
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quote Tool</h1>
        <p className="text-gray-600">Create comprehensive travel quotes for Dubai packages</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Input Form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quote Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter customer email"
                  />
                </div>
              </div>
            </div>

            {/* Travel Dates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Travel Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Check-in Date *</Label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Check-out Date *</Label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              {nights > 0 && (
                <p className="text-sm text-gray-600">Duration: {nights} nights</p>
              )}
            </div>

            {/* Pax Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pax Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Adults</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={adults}
                      onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))}
                      className="text-center"
                      min="1"
                    />
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
                
                <div>
                  <Label>Child with Bed (6-17y)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCwb(Math.max(0, cwb - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={cwb}
                      onChange={(e) => setCwb(Math.max(0, Number(e.target.value)))}
                      className="text-center"
                      min="0"
                    />
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

                <div>
                  <Label>Child no Bed (3-5y)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCnb(Math.max(0, cnb - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={cnb}
                      onChange={(e) => setCnb(Math.max(0, Number(e.target.value)))}
                      className="text-center"
                      min="0"
                    />
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

                <div>
                  <Label>Infants (0-2y)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setInfants(Math.max(0, infants - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={infants}
                      onChange={(e) => setInfants(Math.max(0, Number(e.target.value)))}
                      className="text-center"
                      min="0"
                    />
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
              <p className="text-sm text-gray-600">Total Pax: {pax}</p>
            </div>

            {/* Apartment Mode Toggle */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apartmentMode"
                  checked={apartmentMode}
                  onCheckedChange={(checked) => setApartmentMode(checked === true)}
                />
                <Label htmlFor="apartmentMode">Apartment Mode</Label>
              </div>

              {apartmentMode ? (
                <div>
                  <Label>Apartment Type</Label>
                  <Select value={selectedApartmentType} onValueChange={setSelectedApartmentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01BR">1 Bedroom</SelectItem>
                      <SelectItem value="02BR">2 Bedroom</SelectItem>
                      <SelectItem value="03BR">3 Bedroom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Occupancy Type</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={occupancy.single}
                        onChange={(e) => setOccupancy(prev => ({ ...prev, single: e.target.checked }))}
                      />
                      <span>Single</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={occupancy.double}
                        onChange={(e) => setOccupancy(prev => ({ ...prev, double: e.target.checked }))}
                      />
                      <span>Double</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={occupancy.triple}
                        onChange={(e) => setOccupancy(prev => ({ ...prev, triple: e.target.checked }))}
                      />
                      <span>Triple</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Hotel Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Hotel Selection</h3>
              <div className="space-y-4">
                <div>
                  <Label>Select Hotel *</Label>
                  <HotelSelector
                    hotels={hotels}
                    selectedHotel={selectedHotel}
                    onChange={setSelectedHotel}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Hotel Rate (AED per night) *</Label>
                    <Input
                      type="number"
                      value={hotelRate}
                      onChange={(e) => setHotelRate(e.target.value)}
                      placeholder="Enter rate per night"
                    />
                  </div>
                  {cwb > 0 && (
                    <div>
                      <Label>Extra Bed Rate (AED per night)</Label>
                      <Input
                        type="number"
                        value={extraBedRate}
                        onChange={(e) => setExtraBedRate(e.target.value)}
                        placeholder="Enter extra bed rate"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tours & Inclusions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tours & Inclusions</h3>
              <TourSelector
                tours={allAvailableInclusions}
                selected={selectedTours}
                onChange={setSelectedTours}
              />
            </div>

            {/* Additional Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Services</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visa"
                    checked={includeVisa}
                    onCheckedChange={(checked) => setIncludeVisa(checked === true)}
                  />
                  <Label htmlFor="visa">Include Dubai Tourist Visa (AED 310 per adult, AED 73 per child)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="airportTransfer"
                    checked={includeAirportTransfer}
                    onCheckedChange={(checked) => setIncludeAirportTransfer(checked === true)}
                  />
                  <Label htmlFor="airportTransfer">Include Airport Transfer</Label>
                </div>

                {includeAirportTransfer && (
                  <div className="ml-6">
                    <Label>Manual Transfer Cost (AED) - Leave empty for auto calculation</Label>
                    <Input
                      type="number"
                      value={manualTransferCost}
                      onChange={(e) => setManualTransferCost(e.target.value)}
                      placeholder="Auto: 1-5 pax: 250, 6-10: 500, 11-17: 1000"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button onClick={generateQuoteText} className="bg-primary hover:bg-primary/90">
                Generate Quote
              </Button>
              
              {quoteText && (
                <>
                  <Button variant="outline" onClick={copyFormattedText}>
                    Copy Formatted Text
                  </Button>
                  <Button variant="outline" onClick={downloadPDF}>
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={copyBreakdown}>
                    Copy Breakdown
                  </Button>
                  <Button onClick={saveQuote} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Quote
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generated Quote Display - Below the form */}
        {quoteText && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Generated Quote</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                dangerouslySetInnerHTML={{ __html: quoteText }}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
