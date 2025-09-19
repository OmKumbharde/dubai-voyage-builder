import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { useSupabaseData, Hotel, Tour, Quote } from '@/hooks/useSupabaseData';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'booking';
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

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  hotels: Hotel[];
  tours: Tour[];
  inclusions: Inclusion[];
  quotes: Quote[];
  currentQuote: Quote | null;
  isLoading: boolean;
}

// Demo inclusions since we don't have them in Supabase yet
const demoInclusions: Inclusion[] = [
  {
    id: '1',
    name: 'UAE Tourist Visa',
    type: 'visa',
    cost: 100,
    description: '30-day tourist visa for UAE',
    isOptional: false,
  },
  {
    id: '2',
    name: 'Airport Transfer',
    type: 'transfer',
    cost: 50,
    description: 'Round-trip airport transfer',
    isOptional: true,
  },
];

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_QUOTE'; payload: Quote | null }
  | { type: 'ADD_QUOTE'; payload: Quote }
  | { type: 'UPDATE_QUOTE'; payload: Quote }
  | { type: 'ADD_HOTEL'; payload: Hotel }
  | { type: 'UPDATE_HOTEL'; payload: Hotel }
  | { type: 'DELETE_HOTEL'; payload: string };

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  hotels: [],
  tours: [],
  inclusions: demoInclusions,
  quotes: [],
  currentQuote: null,
  isLoading: true,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_CURRENT_QUOTE':
      return {
        ...state,
        currentQuote: action.payload,
      };
    case 'ADD_QUOTE':
      return {
        ...state,
        quotes: [action.payload, ...state.quotes],
      };
    case 'UPDATE_QUOTE':
      return {
        ...state,
        quotes: state.quotes.map(quote =>
          quote.id === action.payload.id ? action.payload : quote
        ),
      };
    case 'ADD_HOTEL':
      return {
        ...state,
        hotels: [...state.hotels, action.payload],
      };
    case 'UPDATE_HOTEL':
      return {
        ...state,
        hotels: state.hotels.map(hotel =>
          hotel.id === action.payload.id ? action.payload : hotel
        ),
      };
    case 'DELETE_HOTEL':
      return {
        ...state,
        hotels: state.hotels.filter(hotel => hotel.id !== action.payload),
      };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Supabase data operations
  addQuote: (quote: any) => Promise<Quote>;
  updateQuote: (id: string, updates: any) => Promise<Quote>;
  addHotel: (hotel: any) => Promise<Hotel>;
  updateHotel: (id: string, updates: any) => Promise<Hotel>;
  deleteHotel: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Use Supabase data hook
  const {
    hotels,
    tours,
    quotes,
    isLoading,
    addQuote,
    updateQuote,
    addHotel,
    updateHotel,
    deleteHotel,
    refetch
  } = useSupabaseData();

  // Update state when Supabase data changes
  React.useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [isLoading]);

  // Create enhanced state with Supabase data
  const enhancedState: AppState = {
    ...state,
    hotels,
    tours,
    quotes,
    isLoading,
  };

  const value: AppContextType = {
    state: enhancedState,
    dispatch,
    addQuote,
    updateQuote,
    addHotel,
    updateHotel,
    deleteHotel,
    refetch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};