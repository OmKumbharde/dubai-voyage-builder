// Dubai Quote Tool - TypeScript Types

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'booking';
  createdAt: string;
  updatedAt: string;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  baseRate: number;
  extraBedRate: number;
  amenities: string[];
  starRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  type: string;
  capacity: number;
  extraBedCapacity: number;
  baseRate: number;
  extraBedRate: number;
  seasonalRates?: SeasonalRate[];
}

export interface SeasonalRate {
  startDate: string;
  endDate: string;
  rate: number;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  type: 'group' | 'private';
  duration: string;
  costPerPerson: number;
  transferIncluded: boolean;
  images: string[];
  highlights: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Inclusion {
  id: string;
  name: string;
  type: 'visa' | 'transfer' | 'insurance' | 'other';
  cost: number;
  description: string;
  isOptional: boolean;
}

export interface PaxDetails {
  adults: number;
  infants: number;
  cnb: number; // Child No Bed
  cwb: number; // Child With Bed
}

export interface Quote {
  id: string;
  ticketReference: string;
  customerName: string;
  customerEmail?: string;
  travelDates: {
    startDate: string;
    endDate: string;
  };
  paxDetails: PaxDetails;
  selectedHotel: Hotel;
  selectedTours: Tour[];
  selectedInclusions: Inclusion[];
  calculations: {
    hotelCost: number;
    toursCost: number;
    inclusionsCost: number;
    totalCostAED: number;
    totalCostUSD: number;
    exchangeRate: number;
  };
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  quoteId: string;
  invoiceNumber: string;
  pdfUrl?: string;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
}

export interface Itinerary {
  id: string;
  quoteId: string;
  days: ItineraryDay[];
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  tours: Tour[];
  meals: string[];
  notes?: string;
}

export interface Analytics {
  totalQuotes: number;
  totalInvoices: number;
  totalRevenue: number;
  conversionRate: number;
  topHotels: Array<{ hotel: Hotel; bookings: number; revenue: number }>;
  topTours: Array<{ tour: Tour; bookings: number; revenue: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number; quotes: number }>;
  salesPerformance: Array<{ userId: string; userName: string; quotes: number; revenue: number }>;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  hotels: Hotel[];
  tours: Tour[];
  inclusions: Inclusion[];
  quotes: Quote[];
  currentQuote: Quote | null;
}