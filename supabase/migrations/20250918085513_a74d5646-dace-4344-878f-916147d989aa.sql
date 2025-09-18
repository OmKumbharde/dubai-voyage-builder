-- Create hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  star_rating INTEGER DEFAULT 5,
  amenities TEXT[],
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hotel rooms table
CREATE TABLE public.hotel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  extra_bed_capacity INTEGER DEFAULT 1,
  base_rate DECIMAL(10,2) NOT NULL,
  extra_bed_rate DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tours table
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tour_type TEXT NOT NULL DEFAULT 'group',
  duration TEXT,
  cost_per_person DECIMAL(10,2) NOT NULL,
  private_transfer_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  travel_dates_from DATE NOT NULL,
  travel_dates_to DATE NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  infants INTEGER DEFAULT 0,
  cnb INTEGER DEFAULT 0,
  cwb INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AED',
  status TEXT DEFAULT 'draft',
  notes TEXT,
  formatted_quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote hotels junction table
CREATE TABLE public.quote_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  nights INTEGER NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  extra_beds INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL
);

-- Create quote tours junction table
CREATE TABLE public.quote_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  participants INTEGER NOT NULL,
  is_private BOOLEAN DEFAULT false,
  total_cost DECIMAL(10,2) NOT NULL
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.hotel_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tours FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.quote_hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.quote_tours FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON public.tours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.invoices_updated_at_column();

-- Insert sample data
INSERT INTO public.hotels (name, location, description, star_rating, amenities, images) VALUES
('Burj Al Arab Jumeirah', 'Jumeirah Beach', 'Iconic sail-shaped luxury hotel offering unparalleled service and breathtaking views', 7, ARRAY['Private Beach', 'Spa', 'Butler Service', 'Helipad', 'Multiple Restaurants'], ARRAY['/api/placeholder/400/300']),
('Atlantis The Palm', 'Palm Jumeirah', 'Stunning resort featuring marine life, waterpark, and luxury accommodations', 5, ARRAY['Aquaventure Waterpark', 'Lost Chambers Aquarium', 'Spa', 'Multiple Pools', 'Beach Access'], ARRAY['/api/placeholder/400/300']),
('Four Seasons Resort Dubai', 'Jumeirah Beach Road', 'Elegant beachfront resort with world-class amenities and service', 5, ARRAY['Private Beach', 'Spa', 'Kids Club', 'Multiple Restaurants', 'Fitness Center'], ARRAY['/api/placeholder/400/300']);

INSERT INTO public.hotel_rooms (hotel_id, room_type, capacity, extra_bed_capacity, base_rate, extra_bed_rate) VALUES
((SELECT id FROM public.hotels WHERE name = 'Burj Al Arab Jumeirah'), 'Deluxe Suite', 3, 1, 2500.00, 350.00),
((SELECT id FROM public.hotels WHERE name = 'Burj Al Arab Jumeirah'), 'Royal Suite', 4, 2, 5000.00, 350.00),
((SELECT id FROM public.hotels WHERE name = 'Atlantis The Palm'), 'Deluxe Room', 2, 1, 800.00, 200.00),
((SELECT id FROM public.hotels WHERE name = 'Atlantis The Palm'), 'Suite', 4, 1, 1500.00, 200.00),
((SELECT id FROM public.hotels WHERE name = 'Four Seasons Resort Dubai'), 'Premier Room', 2, 1, 600.00, 150.00),
((SELECT id FROM public.hotels WHERE name = 'Four Seasons Resort Dubai'), 'Suite', 3, 1, 1200.00, 150.00);

INSERT INTO public.tours (name, description, tour_type, duration, cost_per_person, private_transfer_cost) VALUES
('Dubai City Tour', 'Explore Dubai''s iconic landmarks including Burj Khalifa, Dubai Mall, and traditional souks', 'group', 'Full Day', 150.00, 300.00),
('Desert Safari Adventure', 'Thrilling desert experience with dune bashing, camel riding, and traditional dinner', 'group', 'Half Day', 200.00, 400.00),
('Dubai Marina Cruise', 'Luxury yacht cruise through Dubai Marina with stunning skyline views', 'group', 'Evening', 180.00, 350.00),
('Private City Tour', 'Personalized exploration of Dubai with dedicated guide and luxury vehicle', 'private', 'Full Day', 300.00, 0.00),
('Helicopter Tour', 'Aerial view of Dubai''s landmarks including Burj Al Arab, Palm Jumeirah, and Burj Khalifa', 'group', '15 minutes', 500.00, 200.00);

-- Generate reference number function
CREATE OR REPLACE FUNCTION generate_reference_number() 
RETURNS TEXT AS $$
BEGIN
  RETURN 'QT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;