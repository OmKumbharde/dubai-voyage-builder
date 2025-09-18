import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";

// Layout and Pages
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import QuoteTool from "./pages/QuoteTool";
import Analytics from "./pages/Analytics";
import BookingCenter from "./pages/BookingCenter";
import HotelsManagement from "./pages/admin/HotelsManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="quote" element={<QuoteTool />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="booking" element={<BookingCenter />} />
              <Route path="admin/hotels" element={<HotelsManagement />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
