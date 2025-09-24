import React, { useState, useMemo } from "react";
import html2pdf from "html2pdf.js";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, Calculator, Save, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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

export default function QuoteTool() {
  const { state, addQuote } = useAppContext();
  const navigate = useNavigate();
  const { hotels, tours, inclusions } = state;

  const getAdultCapacity = (type: string) => {
    if (type === "01BR") return 2;
    if (type === "02BR") return 4;
    if (type === "03BR") return 6;
    return 0;
  };

  const getCnbCapacity = (type: string) => {
    if (type === "01BR") return 1;
    if (type === "02BR") return 2;
    if (type === "03BR") return 3;
    return 0;
  };

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

  const [hotelsList, setHotelsList] = useState([{ name: "", rate: "", extraBed: "" }]);
  const [selectedTours, setSelectedTours] = useState<any[]>([]);
  const [selectedOptionalTours, setSelectedOptionalTours] = useState<any[]>([]);
  const [quoteText, setQuoteText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [copyBtnHover, setCopyBtnHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [manualTransferCost, setManualTransferCost] = useState("");

  const [tourTypeFilter, setTourTypeFilter] = useState({
    sharing: true,
    private: true,
  });

  const isSpecialDoubleOccupancy =
    (adults === cwb && adults % 2 === 0 && cnb === 0) || 
    (adults === 1 && cwb === 1 && cnb === 0);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diff > 0 ? diff / (1000 * 60 * 60 * 24) : 0;
  }, [checkIn, checkOut]);

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
      const basePrice = Number(tour.cost_per_person) || 0;
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

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(hotelsList);
    const [movedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, movedItem);
    setHotelsList(items);
  };

  function handleHotelChange(index: number, field: string, value: string) {
    const updatedHotels = [...hotelsList];
    updatedHotels[index][field as keyof typeof updatedHotels[0]] = value;
    setHotelsList(updatedHotels);
  }

  function addHotel() {
    setHotelsList([...hotelsList, { name: "", rate: "", extraBed: "" }]);
  }

  function removeHotel(index: number) {
    const updated = hotelsList.filter((_, i) => i !== index);
    setHotelsList(updated.length ? updated : [{ name: "", rate: "", extraBed: "" }]);
  }

  function getPaxSummary() {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
    if (cwb > 0) parts.push(`${cwb} Child (06 to 17 Years)`);
    if (cnb > 0) parts.push(`${cnb} Child (03 to 05 Years)`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? "s" : ""}`);
    return parts.join(" + ");
  }

  // Convert backend tours/inclusions to match the expected format
  const convertedTours = tours.map(tour => ({
    id: tour.id,
    name: tour.name,
    cost_per_person: tour.costPerPerson,
    type: tour.type,
  }));

  const convertedInclusions = inclusions.map(inclusion => ({
    id: inclusion.id,
    name: inclusion.name,
    cost: inclusion.cost,
    type: inclusion.type === "visa" ? "visa" : "sharing",
  }));

  const allAvailableInclusions = [...convertedTours, ...convertedInclusions];

  async function saveQuote() {
    if (!customerName || !checkIn || !checkOut) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name and travel dates.",
        variant: "destructive",
      });
      return;
    }

    try {
      const calculations = {
        hotelCost: 0,
        toursCost: calcToursTotalPerPersonAED() * (adults + cwb + cnb),
        inclusionsCost: selectedOptionalTours.reduce((sum, tour) => sum + (Number(tour.cost) || 0), 0),
        totalCostAED: 0,
        totalCostUSD: 0,
        exchangeRate: AED_TO_USD,
      };

      // Calculate total cost
      calculations.totalCostAED = calculations.hotelCost + calculations.toursCost + calculations.inclusionsCost;
      calculations.totalCostUSD = calculations.totalCostAED / AED_TO_USD;

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
        selectedHotel: hotelsList[0] ? { name: hotelsList[0].name } : null,
        selectedTours: selectedTours,
        selectedInclusions: selectedOptionalTours,
        calculations,
        status: 'draft' as const,
        createdBy: state.user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addQuote(newQuote);
      
      toast({
        title: "Quote Saved",
        description: "Quote has been saved successfully!",
      });

      navigate('/quote-management');
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  }

  const colors = {
    primary: "#E12677",
    secondary: "#E12677",
    bgLight: "#FFFFFF",
    textDark: "#000000",
  };

  const buttonStyle = {
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
    color: "#fff",
    backgroundColor: colors.primary,
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    transition: "all 0.2s",
  };

  const buttonHover = {
    backgroundColor: "#c91f5c",
    transform: "translateY(-1px)",
  };

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
    if (hotelsList.length === 0 || hotelsList.some((h) => !h.name || !h.rate)) {
      alert("Please enter at least one hotel with name and rate.");
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

    // Generate hotel table HTML
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
    <tbody>
`;

    hotelsList.forEach((hotel) => {
      const { name, rate, extraBed } = hotel;
      const hotelRateAED = Number(rate || 0);

      hotelTable += `<tr><td style="padding: 4px;">${name}</td>`;

      const visaAdult = includeVisa ? 310 / AED_TO_USD : 0;
      const visaChild = includeVisa ? 20 : 0;
      const toursUSD = calcToursTotalPerPersonAED() / AED_TO_USD;
      const airportTransferPerAdult = includeAirportTransfer
        ? (Number(manualTransferCost) || calcAirportTransferCostAED()) / adults / AED_TO_USD
        : 0;

      if (apartmentMode) {
        const config = apartmentTypes[selectedApartmentType];
        const totalCostAED = hotelRateAED * nights;
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
          const extraBedCostUSD = (Number(extraBed || 0) * nights) / AED_TO_USD;
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
        if (occupancy.double) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            Number(rate),
            "double"
          )} per person with BB</td>`;
        }
        if (occupancy.single) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            Number(rate),
            "single"
          )} per person with BB</td>`;
        }
        if (occupancy.triple) {
          hotelTable += `<td style="padding: 4px;">USD ${calcPerPersonUSD(
            Number(rate),
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

    // Generate tours lines
    const toursLines = selectedTours
      .map((tour) => {
        if (!tour) return "";
        return `<li>${tour.name}</li>`;
      })
      .join("");

    const totalPax = adults + cnb + cwb;
    const optionalToursLines = selectedOptionalTours
      .map((tour) => {
        const baseAED = Number(tour.cost || tour.cost_per_person || 0);
        const transferAED = Number(tour.transferCost || 0);
        const perPersonTransferAED = totalPax > 0 ? transferAED / totalPax : 0;
        const totalAED = baseAED + perPersonTransferAED;
        const priceUSD = Math.ceil(totalAED / AED_TO_USD);
        return `<li>${tour.name} @ USD ${priceUSD} per person</li>`;
      })
      .join("");

    const visaLine = includeVisa ? `<li>Dubai Tourist Visa Fees</li>` : "";
    const airportTransferLine = includeAirportTransfer
      ? `<li>Private Return Airport Transfers (Dubai International Airport Terminal 1, 2, or 3)</li>`
      : "";
    const taxLine = `<li>All taxes except Tourism Dirham</li>`;

    const hasTour = selectedTours.length > 0;
    const hasPrivateTour = selectedTours.some((tour) => tour.type === "private");
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

    const fullQuote = `
    <div style="font-family: Arial, sans-serif; line-height: 1.3; font-size: 13px;">
      Dear Partner,<br /><br />

      Greetings for the day…!!!<br /><br />

      Pleased to quote you as below :<br /><br />

      Kindly check the rate / hotel availability with us when your client is ready to book<br /><br />

      <strong>No of Pax:</strong> ${getPaxSummary()}<br />
      <strong>Check-in:</strong> ${formatDate(checkIn)}<br />
      <strong>Check-out:</strong> ${formatDate(checkOut)}<br />

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
    setEditMode(false);
  }

  const generatePDF = () => {
    const quoteElement = document.getElementById("quote-preview");
    if (!quoteElement) return;

    const clone = quoteElement.cloneNode(true) as HTMLElement;
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    clone.style.border = "none";
    clone.style.padding = "0";
    clone.style.backgroundColor = "#fff";
    clone.style.color = "#000";

    const wrapper = document.createElement("div");
    wrapper.style.padding = "20px";
    wrapper.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    wrapper.style.backgroundColor = "#fff";
    wrapper.style.color = "#000";
    wrapper.appendChild(clone);

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: "Dubai_Quote.pdf",
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait" as const,
      },
    };

    html2pdf().set(opt).from(wrapper).save();
  };

  function copyToClipboard() {
    if (!quoteText) return;

    if (editMode) {
      navigator.clipboard.writeText(quoteText).then(() => {
        toast({
          title: "Success",
          description: "Raw quote copied to clipboard!",
        });
      });
    } else {
      const previewDiv = document.getElementById("quote-preview");
      if (previewDiv) {
        const range = document.createRange();
        range.selectNodeContents(previewDiv);

        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        try {
          document.execCommand("copy");
          selection?.removeAllRanges();
          toast({
            title: "Success",
            description: "Formatted quote copied to clipboard!",
          });
        } catch (err) {
          console.error("Copy failed:", err);
          toast({
            title: "Error",
            description: "Failed to copy formatted quote.",
            variant: "destructive",
          });
        }
      }
    }
  }

  const copyTextSummary = () => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const numberOfNights = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24);

    const checkInFormatted = checkInDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    const checkOutFormatted = checkOutDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    let summaryText = `${checkInFormatted} - ${checkOutFormatted}\n`;
    summaryText += `${
      numberOfNights < 10 ? "0" + numberOfNights : numberOfNights
    } Nights\n`;

    let paxText = `${adults} Adults`;
    if (cnb > 0) paxText += ` + ${cnb} Child (03 to 05 Years)`;
    if (cwb > 0) paxText += ` + ${cwb} Child (06 to 17 Years)`;
    summaryText += `${paxText}\n\n`;

    hotelsList.forEach((hotel) => {
      if (hotel.name && hotel.rate) {
        const hasCWB = cwb > 0;
        const showExtraBed = hasCWB && !isSpecialDoubleOccupancy;

        if (showExtraBed) {
          const extraBedRate = hotel.extraBed || 0;
          summaryText += `${hotel.name} - ${hotel.rate} sell | ${extraBedRate} EB\n`;
        } else {
          summaryText += `${hotel.name} - ${hotel.rate} sell\n`;
        }
      }
    });

    summaryText += `\n`;

    let tourTotalPerPerson = 0;
    const totalPaxForSharing = adults + cwb + cnb;

    selectedTours.forEach((tour) => {
      const tourPriceAED = parseFloat(tour.cost_per_person) || 0;
      const transferCost = parseFloat(tour.transferCost || 0);
      const transferPerPerson = tour.type === "private" ? transferCost / totalPaxForSharing : 0;
      const totalPerPersonAED = tourPriceAED + transferPerPerson;

      summaryText += `${tour.name} - ${Math.round(totalPerPersonAED)}\n`;
      tourTotalPerPerson += totalPerPersonAED;
    });

    if (includeVisa) {
      summaryText += `Visa - 310`;
      if (cnb > 0 || cwb > 0) summaryText += `, 73`;
      summaryText += `\n`;
    }

    let perPersonAT = 0;
    if (includeAirportTransfer) {
      const airportTransferTotal = calcAirportTransferCostAED();
      const paxForSharing = adults;
      if (paxForSharing > 0) {
        perPersonAT = airportTransferTotal / paxForSharing;
        summaryText += `AT (per person) - ${Math.round(perPersonAT)}\n`;
      }
    }

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
    toast({
      title: "Success",
      description: "Quote Breakdown copied to clipboard!",
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1.5px solid #e12677",
    fontSize: "12px",
    outline: "none",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Dubai Quote Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 min-h-screen">
            {/* Left Column - Form */}
            <div className="flex-1 space-y-4">
              {/* Customer Details */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Customer Details</h3>
                <div className="grid grid-cols-2 gap-4">
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
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Enter customer email"
                    />
                  </div>
                </div>
              </div>

              {/* Travel Dates */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Travel Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in Date</Label>
                    <Input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Check-out Date</Label>
                    <Input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
                {nights > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Pax Details */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Pax Details</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Adults (18+)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-8 text-center">{adults}</span>
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
                    <Label>CWB (6-17 yrs)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCwb(Math.max(0, cwb - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-8 text-center">{cwb}</span>
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
                  <div>
                    <Label>CNB (3-5 yrs)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCnb(Math.max(0, cnb - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-8 text-center">{cnb}</span>
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
                    <Label>Infants (0-2 yrs)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfants(Math.max(0, infants - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-8 text-center">{infants}</span>
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
                </div>
              </div>

              {/* Accommodation Mode */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Accommodation Type</h3>
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!apartmentMode}
                      onChange={() => setApartmentMode(false)}
                    />
                    Hotel Mode
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={apartmentMode}
                      onChange={() => setApartmentMode(true)}
                    />
                    Apartment Mode
                  </label>
                </div>

                {apartmentMode ? (
                  <div>
                    <Label>Apartment Type</Label>
                    <div className="flex gap-2 mt-2">
                      {Object.keys(apartmentTypes).map((type) => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={selectedApartmentType === type}
                            onChange={() => setSelectedApartmentType(type)}
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Occupancy Type</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={occupancy.single}
                          onChange={() =>
                            setOccupancy((prev) => ({
                              ...prev,
                              single: !prev.single,
                            }))
                          }
                        />
                        Single
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={occupancy.double}
                          onChange={() =>
                            setOccupancy((prev) => ({
                              ...prev,
                              double: !prev.double,
                            }))
                          }
                        />
                        Double
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={occupancy.triple}
                          onChange={() =>
                            setOccupancy((prev) => ({
                              ...prev,
                              triple: !prev.triple,
                            }))
                          }
                        />
                        Triple
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Hotels */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Hotels</h3>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="hotels">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {hotelsList.map((hotel, i) => (
                          <Draggable key={i} draggableId={String(i)} index={i}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center gap-2 mb-2 p-2 border rounded"
                              >
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input
                                  placeholder="Hotel Name"
                                  value={hotel.name}
                                  onChange={(e) =>
                                    handleHotelChange(i, "name", e.target.value)
                                  }
                                  className="text-xs"
                                />
                                <Input
                                  type="number"
                                  placeholder="Rate (AED)"
                                  value={hotel.rate}
                                  onChange={(e) =>
                                    handleHotelChange(i, "rate", e.target.value)
                                  }
                                  className="w-24 text-xs"
                                />
                                {cwb > 0 && !isSpecialDoubleOccupancy && (
                                  <Input
                                    type="number"
                                    placeholder="Extra Bed"
                                    value={hotel.extraBed}
                                    onChange={(e) =>
                                      handleHotelChange(i, "extraBed", e.target.value)
                                    }
                                    className="w-20 text-xs"
                                  />
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeHotel(i)}
                                >
                                  ×
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addHotel}
                          className="mt-2"
                        >
                          + Add Hotel
                        </Button>
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              {/* Visa and Transfer */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={includeVisa}
                    onChange={() => setIncludeVisa(!includeVisa)}
                  />
                  Dubai Tourist Visa (AED 310/AED 73)
                </label>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeAirportTransfer}
                      onChange={() =>
                        setIncludeAirportTransfer(!includeAirportTransfer)
                      }
                    />
                    Private Return Airport Transfer
                  </label>

                  {includeAirportTransfer && (
                    <Input
                      type="number"
                      placeholder="Total (AED)"
                      value={manualTransferCost}
                      onChange={(e) => setManualTransferCost(e.target.value)}
                      className="w-24 text-xs"
                    />
                  )}
                </div>
              </div>

              {/* Tours */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Inclusions</h3>
                <div className="mb-2">
                  <label className="flex items-center gap-2 mr-4">
                    <input
                      type="checkbox"
                      checked={tourTypeFilter.sharing}
                      onChange={() =>
                        setTourTypeFilter((prev) => ({
                          ...prev,
                          sharing: !prev.sharing,
                        }))
                      }
                    />
                    Sharing Tours
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tourTypeFilter.private}
                      onChange={() =>
                        setTourTypeFilter((prev) => ({
                          ...prev,
                          private: !prev.private,
                        }))
                      }
                    />
                    Private Tours
                  </label>
                </div>

                <TourSelector
                  tours={allAvailableInclusions.filter(
                    (tour) =>
                      (tourTypeFilter.sharing && tour.type === "sharing") ||
                      (tourTypeFilter.private && tour.type === "private")
                  )}
                  selected={selectedTours}
                  onChange={setSelectedTours}
                />

                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-2">Select Optional Cost</h4>
                  <TourSelector
                    tours={allAvailableInclusions}
                    selected={selectedOptionalTours}
                    onChange={setSelectedOptionalTours}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={generateQuoteText} className="flex-1">
                  Generate Quote
                </Button>
                <Button onClick={saveQuote} variant="secondary" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Quote
                </Button>
              </div>
            </div>

            {/* Right Column - Quote Preview */}
            {quoteText && (
              <div className="flex-2 min-w-96">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Generated Quote</h3>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? "Preview" : "Edit"}
                  </Button>
                </div>

                {editMode ? (
                  <textarea
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    rows={20}
                    className="w-full text-xs border border-primary rounded p-3 resize-y h-96"
                  />
                ) : (
                  <div
                    id="quote-preview"
                    className="bg-white border border-primary rounded p-3 text-xs max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: quoteText }}
                  />
                )}

                <div className="flex gap-2 mt-4">
                  <Button onClick={copyToClipboard} className="flex-1 text-xs">
                    Copy Quote to Clipboard
                  </Button>
                  <Button onClick={generatePDF} variant="outline" className="flex-1 text-xs">
                    Export Quote as PDF
                  </Button>
                  <Button onClick={copyTextSummary} variant="outline" className="flex-1 text-xs">
                    Copy Breakdown
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}