import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";

// Layout and Pages
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import QuoteTool from "./pages/QuoteTool";
import Analytics from "./pages/Analytics";
import BookingCenter from "./pages/BookingCenter";
import HotelsManagement from "./pages/admin/HotelsManagement";
import ToursManagement from "./pages/admin/ToursManagement";
import InclusionsManagement from "./pages/admin/InclusionsManagement";
import HotelRatesManagement from "./pages/admin/HotelRatesManagement";
import BankAccountsManagement from "./pages/admin/BankAccountsManagement";
import QuoteManagement from "./pages/QuoteManagement";
import ItineraryModule from "./pages/ItineraryModule";
import SharedItinerary from "./pages/SharedItinerary";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/shared-itinerary/:shareToken" element={<SharedItinerary />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="quote" element={<QuoteTool />} />
                <Route path="quotes" element={<QuoteManagement />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="booking" element={<BookingCenter />} />
                <Route path="itinerary" element={<ItineraryModule />} />
                <Route path="admin/hotels" element={<HotelsManagement />} />
                <Route path="admin/tours" element={<ToursManagement />} />
                <Route path="admin/inclusions" element={<InclusionsManagement />} />
                <Route path="admin/hotel-rates" element={<HotelRatesManagement />} />
                <Route path="admin/bank-accounts" element={<BankAccountsManagement />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
