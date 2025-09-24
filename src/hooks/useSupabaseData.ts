import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

// Database types from Supabase
export interface DbHotel {
  id: string;
  name: string;
  location: string;
  description: string | null;
  star_rating: number | null;
  amenities: string[] | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbHotelRoom {
  id: string;
  hotel_id: string | null;
  room_type: string;
  capacity: number;
  extra_bed_capacity: number | null;
  base_rate: number;
  extra_bed_rate: number | null;
  created_at: string;
}

export interface DbTour {
  id: string;
  name: string;
  description: string | null;
  type: string;
  duration: string | null;
  cost_per_person: number;
  transfer_included: boolean;
  private_transfer_cost: number | null;
  highlights: string[] | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbInclusion {
  id: string;
  name: string;
  type: string;
  cost: number;
  description: string | null;
  is_optional: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbQuote {
  id: string;
  reference_number: string;
  client_name: string;
  client_email: string | null;
  travel_dates_from: string;
  travel_dates_to: string;
  adults: number;
  infants: number | null;
  cnb: number | null;
  cwb: number | null;
  total_amount: number;
  currency: string | null;
  status: string | null;
  notes: string | null;
  formatted_quote: string | null;
  created_at: string;
  updated_at: string;
}

// Application interfaces (matching the original types)
export interface Room {
  id: string;
  type: string;
  capacity: number;
  extraBedCapacity: number;
  baseRate: number;
  extraBedRate: number;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  description: string;
  starRating: number;
  amenities: string[];
  images: string[];
  rooms: Room[];
  createdAt: string;
  updatedAt: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  type: 'group' | 'private';
  duration: string;
  costPerPerson: number;
  transferIncluded: boolean;
  privateTransferCost?: number;
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

export interface Quote {
  id: string;
  ticketReference: string;
  customerName: string;
  customerEmail?: string;
  travelDates: {
    startDate: string;
    endDate: string;
  };
  paxDetails: {
    adults: number;
    infants: number;
    cnb: number;
    cwb: number;
  };
  selectedHotel: Hotel | null;
  selectedRoom: Room | null;
  selectedTours: Tour[];
  calculations: {
    totalCostAED: number;
    totalCostUSD: number;
    exchangeRate: number;
  };
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Adapters to convert database types to application types
const adaptDbHotelToHotel = (dbHotel: DbHotel): Hotel => ({
  id: dbHotel.id,
  name: dbHotel.name,
  location: dbHotel.location,
  description: dbHotel.description || '',
  starRating: dbHotel.star_rating || 5,
  amenities: dbHotel.amenities || [],
  images: dbHotel.images || ['/api/placeholder/400/300'],
  baseRate: 500, // Default base rate, will be managed via hotel_rates table
  createdAt: dbHotel.created_at,
  updatedAt: dbHotel.updated_at,
});

const adaptDbTourToTour = (dbTour: DbTour): Tour => ({
  id: dbTour.id,
  name: dbTour.name,
  description: dbTour.description || '',
  type: dbTour.type as 'group' | 'private',
  duration: dbTour.duration || '',
  costPerPerson: Number(dbTour.cost_per_person),
  transferIncluded: Boolean(dbTour.transfer_included),
  privateTransferCost: dbTour.private_transfer_cost ? Number(dbTour.private_transfer_cost) : undefined,
  images: dbTour.images || ['/api/placeholder/400/300'],
  highlights: dbTour.highlights || [],
  createdAt: dbTour.created_at,
  updatedAt: dbTour.updated_at,
});

const adaptDbInclusionToInclusion = (dbInclusion: DbInclusion): Inclusion => ({
  id: dbInclusion.id,
  name: dbInclusion.name,
  type: dbInclusion.type as 'visa' | 'transfer' | 'insurance' | 'other',
  cost: Number(dbInclusion.cost),
  description: dbInclusion.description || '',
  isOptional: Boolean(dbInclusion.is_optional)
});

const adaptDbQuoteToQuote = (dbQuote: DbQuote): Quote => ({
  id: dbQuote.id,
  ticketReference: dbQuote.reference_number,
  customerName: dbQuote.client_name,
  customerEmail: dbQuote.client_email || undefined,
  travelDates: {
    startDate: dbQuote.travel_dates_from,
    endDate: dbQuote.travel_dates_to,
  },
  paxDetails: {
    adults: dbQuote.adults,
    infants: dbQuote.infants || 0,
    cnb: dbQuote.cnb || 0,
    cwb: dbQuote.cwb || 0,
  },
  selectedHotel: null, // Will be populated separately if needed
  selectedRoom: null, // Will be populated separately if needed
  selectedTours: [], // Will be populated separately if needed
  calculations: {
    totalCostAED: Number(dbQuote.total_amount),
    totalCostUSD: Number(dbQuote.total_amount) / 3.67, // Approximate AED to USD conversion
    exchangeRate: 3.67,
  },
  status: (dbQuote.status as any) || 'draft',
  createdBy: 'system', // Default value
  createdAt: dbQuote.created_at,
  updatedAt: dbQuote.updated_at,
});

export const useSupabaseData = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [inclusions, setInclusions] = useState<Inclusion[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch all data
  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [hotelsRes, toursRes, inclusionsRes, quotesRes] = await Promise.all([
        supabase.from('hotels').select('*').order('name'),
        supabase.from('tours').select('*').order('name'),
        supabase.from('inclusions').select('*').order('name'),
        supabase.from('quotes').select('*').order('created_at', { ascending: false })
      ]);

      if (hotelsRes.error) throw hotelsRes.error;
      if (toursRes.error) throw toursRes.error;
      if (inclusionsRes.error) throw inclusionsRes.error;
      if (quotesRes.error) throw quotesRes.error;

      // Adapt the data
      const adaptedHotels = (hotelsRes.data || []).map(hotel => adaptDbHotelToHotel(hotel));
      const adaptedTours = (toursRes.data || []).map(adaptDbTourToTour);
      const adaptedInclusions = (inclusionsRes.data || []).map(adaptDbInclusionToInclusion);
      const adaptedQuotes = (quotesRes.data || []).map(adaptDbQuoteToQuote);

      setHotels(adaptedHotels);
      setTours(adaptedTours);
      setInclusions(adaptedInclusions);
      setQuotes(adaptedQuotes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load application data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD operations for hotels
  const addHotel = async (hotel: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .insert([{
          name: hotel.name,
          location: hotel.location,
          description: hotel.description,
          star_rating: hotel.starRating,
          amenities: hotel.amenities,
          images: hotel.images,
        }])
        .select()
        .single();

      if (error) throw error;
      
      const adaptedHotel = adaptDbHotelToHotel(data);
      setHotels(prev => [...prev, adaptedHotel]);
      toast({
        title: "Hotel added",
        description: `${hotel.name} has been added successfully.`,
      });
      return adaptedHotel;
    } catch (error) {
      console.error('Error adding hotel:', error);
      toast({
        title: "Error adding hotel",
        description: "Failed to add hotel. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateHotel = async (id: string, updates: Partial<Hotel>) => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .update({
          name: updates.name,
          location: updates.location,
          description: updates.description,
          star_rating: updates.starRating,
          amenities: updates.amenities,
          images: updates.images,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const adaptedHotel = adaptDbHotelToHotel(data);
      setHotels(prev => prev.map(h => h.id === id ? adaptedHotel : h));
      toast({
        title: "Hotel updated",
        description: "Hotel information has been updated successfully.",
      });
      return adaptedHotel;
    } catch (error) {
      console.error('Error updating hotel:', error);
      toast({
        title: "Error updating hotel",
        description: "Failed to update hotel. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteHotel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setHotels(prev => prev.filter(h => h.id !== id));
      toast({
        title: "Hotel deleted",
        description: "Hotel has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting hotel:', error);
      toast({
        title: "Error deleting hotel",
        description: "Failed to delete hotel. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Tours CRUD operations
  const addTour = async (tour: Omit<Tour, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tour> => {
    try {
      const tourData = {
        name: tour.name,
        description: tour.description,
        type: tour.type,
        duration: tour.duration,
        cost_per_person: tour.costPerPerson,
        transfer_included: tour.transferIncluded,
        private_transfer_cost: tour.privateTransferCost || 0,
        highlights: tour.highlights,
        images: tour.images
      };

      const { data, error } = await supabase
        .from('tours')
        .insert([tourData])
        .select()
        .single();

      if (error) throw error;

      const newTour = adaptDbTourToTour(data);
      setTours(prev => [...prev, newTour]);
      
      toast({
        title: "Tour Added",
        description: `${tour.name} has been added successfully`
      });
      
      return newTour;
    } catch (error) {
      console.error('Error adding tour:', error);
      toast({
        title: "Error",
        description: "Failed to add tour",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateTour = async (id: string, updates: Partial<Tour>): Promise<Tour> => {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.type) updateData.type = updates.type;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.costPerPerson !== undefined) updateData.cost_per_person = updates.costPerPerson;
      if (updates.transferIncluded !== undefined) updateData.transfer_included = updates.transferIncluded;
      if (updates.privateTransferCost !== undefined) updateData.private_transfer_cost = updates.privateTransferCost;
      if (updates.highlights) updateData.highlights = updates.highlights;
      if (updates.images) updateData.images = updates.images;

      const { data, error } = await supabase
        .from('tours')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedTour = adaptDbTourToTour(data);
      setTours(prev => prev.map(tour => tour.id === id ? updatedTour : tour));
      
      toast({
        title: "Tour Updated",
        description: `${updatedTour.name} has been updated successfully`
      });
      
      return updatedTour;
    } catch (error) {
      console.error('Error updating tour:', error);
      toast({
        title: "Error",
        description: "Failed to update tour",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteTour = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tours')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTours(prev => prev.filter(tour => tour.id !== id));
      
      toast({
        title: "Tour Deleted",
        description: "Tour has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting tour:', error);
      toast({
        title: "Error",
        description: "Failed to delete tour",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Inclusions CRUD operations
  const addInclusion = async (inclusion: Omit<Inclusion, 'id'>): Promise<Inclusion> => {
    try {
      const inclusionData = {
        name: inclusion.name,
        type: inclusion.type,
        cost: inclusion.cost,
        description: inclusion.description,
        is_optional: inclusion.isOptional
      };

      const { data, error } = await supabase
        .from('inclusions')
        .insert([inclusionData])
        .select()
        .single();

      if (error) throw error;

      const newInclusion = adaptDbInclusionToInclusion(data);
      setInclusions(prev => [...prev, newInclusion]);
      
      toast({
        title: "Inclusion Added",
        description: `${inclusion.name} has been added successfully`
      });
      
      return newInclusion;
    } catch (error) {
      console.error('Error adding inclusion:', error);
      toast({
        title: "Error",
        description: "Failed to add inclusion",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateInclusion = async (id: string, updates: Partial<Inclusion>): Promise<Inclusion> => {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.description) updateData.description = updates.description;
      if (updates.isOptional !== undefined) updateData.is_optional = updates.isOptional;

      const { data, error } = await supabase
        .from('inclusions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedInclusion = adaptDbInclusionToInclusion(data);
      setInclusions(prev => prev.map(inclusion => inclusion.id === id ? updatedInclusion : inclusion));
      
      toast({
        title: "Inclusion Updated",
        description: `${updatedInclusion.name} has been updated successfully`
      });
      
      return updatedInclusion;
    } catch (error) {
      console.error('Error updating inclusion:', error);
      toast({
        title: "Error",
        description: "Failed to update inclusion",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteInclusion = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('inclusions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInclusions(prev => prev.filter(inclusion => inclusion.id !== id));
      
      toast({
        title: "Inclusion Deleted",
        description: "Inclusion has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting inclusion:', error);
      toast({
        title: "Error",
        description: "Failed to delete inclusion",
        variant: "destructive"
      });
      throw error;
    }
  };

  // CRUD operations for quotes
  const addQuote = async (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'ticketReference'>) => {
    try {
      // Generate reference number client-side
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const referenceNumber = `QT-${dateStr}-${randomNum}`;

      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          reference_number: referenceNumber,
          client_name: quote.customerName,
          client_email: quote.customerEmail,
          travel_dates_from: quote.travelDates.startDate,
          travel_dates_to: quote.travelDates.endDate,
          adults: quote.paxDetails.adults,
          infants: quote.paxDetails.infants,
          cnb: quote.paxDetails.cnb,
          cwb: quote.paxDetails.cwb,
          total_amount: quote.calculations.totalCostAED,
          currency: 'AED',
          status: quote.status,
        }])
        .select()
        .single();

      if (error) throw error;
      
      const adaptedQuote = adaptDbQuoteToQuote(data);
      setQuotes(prev => [adaptedQuote, ...prev]);
      toast({
        title: "Quote created",
        description: `Quote ${adaptedQuote.ticketReference} has been created successfully.`,
      });
      return adaptedQuote;
    } catch (error) {
      console.error('Error adding quote:', error);
      toast({
        title: "Error creating quote",
        description: "Failed to create quote. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({
          client_name: updates.customerName,
          client_email: updates.customerEmail,
          status: updates.status,
          total_amount: updates.calculations?.totalCostAED,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const adaptedQuote = adaptDbQuoteToQuote(data);
      setQuotes(prev => prev.map(q => q.id === id ? adaptedQuote : q));
      toast({
        title: "Quote updated",
        description: "Quote has been updated successfully.",
      });
      return adaptedQuote;
    } catch (error) {
      console.error('Error updating quote:', error);
      toast({
        title: "Error updating quote",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchData();

    // Set up real-time subscriptions
    const quotesSubscription = supabase
      .channel('quotes-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'quotes'
      }, (payload) => {
        const adaptedQuote = adaptDbQuoteToQuote(payload.new as DbQuote);
        setQuotes(prev => [adaptedQuote, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quotes'
      }, (payload) => {
        const adaptedQuote = adaptDbQuoteToQuote(payload.new as DbQuote);
        setQuotes(prev => prev.map(q => q.id === adaptedQuote.id ? adaptedQuote : q));
      })
      .subscribe();

    const hotelsSubscription = supabase
      .channel('hotels-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hotels'
      }, (payload) => {
        const adaptedHotel = adaptDbHotelToHotel(payload.new as DbHotel);
        setHotels(prev => [...prev, adaptedHotel]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hotels'
      }, (payload) => {
        const adaptedHotel = adaptDbHotelToHotel(payload.new as DbHotel);
        setHotels(prev => prev.map(h => h.id === adaptedHotel.id ? adaptedHotel : h));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(quotesSubscription);
      supabase.removeChannel(hotelsSubscription);
    };
  }, [user]);

  return {
    hotels,
    tours,
    inclusions,
    quotes,
    isLoading,
    addHotel,
    updateHotel,
    deleteHotel,
    addTour,
    updateTour,
    deleteTour,
    addInclusion,
    updateInclusion,
    deleteInclusion,
    addQuote,
    updateQuote,
    refetch: fetchData
  };
};