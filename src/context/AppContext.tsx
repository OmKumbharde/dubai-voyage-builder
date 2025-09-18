import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, User, Hotel, Tour, Inclusion, Quote } from '../types';

// Demo data for immediate functionality
const demoUser: User = {
  id: '1',
  name: 'Ahmed Al-Rashid',
  email: 'ahmed@dubaiquote.com',
  role: 'sales',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const demoHotels: Hotel[] = [
  {
    id: '1',
    name: 'Burj Al Arab Jumeirah',
    location: 'Jumeirah Beach',
    description: 'The world\'s most luxurious hotel',
    images: ['/api/placeholder/400/300'],
    starRating: 7,
    amenities: ['Private Beach', 'Spa', 'Butler Service', 'Helicopter Pad'],
    rooms: [
      {
        id: '1-1',
        type: 'One Bedroom Suite',
        capacity: 3,
        extraBedCapacity: 1,
        baseRate: 2500,
        extraBedRate: 300
      },
      {
        id: '1-2',
        type: 'Two Bedroom Suite',
        capacity: 6,
        extraBedCapacity: 2,
        baseRate: 4000,
        extraBedRate: 400
      }
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Atlantis The Palm',
    location: 'Palm Jumeirah',
    description: 'Iconic resort with aquarium and water park',
    images: ['/api/placeholder/400/300'],
    starRating: 5,
    amenities: ['Aquaventure Waterpark', 'Lost Chambers Aquarium', 'Private Beach', 'Spa'],
    rooms: [
      {
        id: '2-1',
        type: 'Deluxe Room',
        capacity: 4,
        extraBedCapacity: 1,
        baseRate: 800,
        extraBedRate: 150
      },
      {
        id: '2-2',
        type: 'Ocean Suite',
        capacity: 6,
        extraBedCapacity: 2,
        baseRate: 1500,
        extraBedRate: 200
      }
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

const demoTours: Tour[] = [
  {
    id: '1',
    name: 'Dubai City Tour',
    description: 'Explore Dubai\'s iconic landmarks and culture',
    type: 'group',
    duration: '8 hours',
    costPerPerson: 180,
    transferIncluded: true,
    images: ['/api/placeholder/400/300'],
    highlights: ['Burj Khalifa', 'Dubai Mall', 'Gold Souk', 'Spice Souk', 'Dubai Creek'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Desert Safari Premium',
    description: 'Luxury desert experience with BBQ dinner',
    type: 'private',
    duration: '6 hours',
    costPerPerson: 320,
    transferIncluded: true,
    images: ['/api/placeholder/400/300'],
    highlights: ['Dune Bashing', 'Camel Riding', 'Falcon Show', 'BBQ Dinner', 'Traditional Shows'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

const demoInclusions: Inclusion[] = [
  {
    id: '1',
    name: 'UAE Tourist Visa',
    type: 'visa',
    cost: 100,
    description: '30-day tourist visa for UAE',
    isOptional: false
  },
  {
    id: '2',
    name: 'Airport Transfer',
    type: 'transfer',
    cost: 80,
    description: 'Round trip airport transfers',
    isOptional: true
  }
];

const initialState: AppState = {
  user: demoUser,
  isAuthenticated: true,
  hotels: demoHotels,
  tours: demoTours,
  inclusions: demoInclusions,
  quotes: [],
  currentQuote: null
};

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENT_QUOTE'; payload: Quote | null }
  | { type: 'ADD_QUOTE'; payload: Quote }
  | { type: 'UPDATE_QUOTE'; payload: Quote }
  | { type: 'ADD_HOTEL'; payload: Hotel }
  | { type: 'UPDATE_HOTEL'; payload: Hotel }
  | { type: 'ADD_TOUR'; payload: Tour }
  | { type: 'UPDATE_TOUR'; payload: Tour };

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_CURRENT_QUOTE':
      return { ...state, currentQuote: action.payload };
    case 'ADD_QUOTE':
      return { ...state, quotes: [...state.quotes, action.payload] };
    case 'UPDATE_QUOTE':
      return { 
        ...state, 
        quotes: state.quotes.map(q => q.id === action.payload.id ? action.payload : q),
        currentQuote: state.currentQuote?.id === action.payload.id ? action.payload : state.currentQuote
      };
    case 'ADD_HOTEL':
      return { ...state, hotels: [...state.hotels, action.payload] };
    case 'UPDATE_HOTEL':
      return { 
        ...state, 
        hotels: state.hotels.map(h => h.id === action.payload.id ? action.payload : h)
      };
    case 'ADD_TOUR':
      return { ...state, tours: [...state.tours, action.payload] };
    case 'UPDATE_TOUR':
      return { 
        ...state, 
        tours: state.tours.map(t => t.id === action.payload.id ? action.payload : t)
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};