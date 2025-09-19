-- Add junction tables and sample data
CREATE TABLE IF NOT EXISTS public.quote_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  nights INTEGER NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  extra_beds INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quote_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  participants INTEGER NOT NULL,
  is_private BOOLEAN DEFAULT false,
  total_cost DECIMAL(10,2) NOT NULL
);

-- Enable RLS on junction tables
ALTER TABLE public.quote_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_tours ENABLE ROW LEVEL SECURITY;

-- Create policies for junction tables
CREATE POLICY "Enable all access for authenticated users" ON public.quote_hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.quote_tours FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO public.hotels (name, location, description, star_rating, amenities, images) VALUES
('Burj Al Arab Jumeirah', 'Jumeirah Beach', 'Iconic sail-shaped luxury hotel offering unparalleled service and breathtaking views', 7, ARRAY['Private Beach', 'Spa', 'Butler Service', 'Helipad', 'Multiple Restaurants'], ARRAY['/api/placeholder/400/300']),
('Atlantis The Palm', 'Palm Jumeirah', 'Stunning resort featuring marine life, waterpark, and luxury accommodations', 5, ARRAY['Aquaventure Waterpark', 'Lost Chambers Aquarium', 'Spa', 'Multiple Pools', 'Beach Access'], ARRAY['/api/placeholder/400/300']),
('Four Seasons Resort Dubai', 'Jumeirah Beach Road', 'Elegant beachfront resort with world-class amenities and service', 5, ARRAY['Private Beach', 'Spa', 'Kids Club', 'Multiple Restaurants', 'Fitness Center'], ARRAY['/api/placeholder/400/300'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.hotel_rooms (hotel_id, room_type, capacity, extra_bed_capacity, base_rate, extra_bed_rate) VALUES
((SELECT id FROM public.hotels WHERE name = 'Burj Al Arab Jumeirah'), 'Deluxe Suite', 3, 1, 2500.00, 350.00),
((SELECT id FROM public.hotels WHERE name = 'Burj Al Arab Jumeirah'), 'Royal Suite', 4, 2, 5000.00, 350.00),
((SELECT id FROM public.hotels WHERE name = 'Atlantis The Palm'), 'Deluxe Room', 2, 1, 800.00, 200.00),
((SELECT id FROM public.hotels WHERE name = 'Atlantis The Palm'), 'Suite', 4, 1, 1500.00, 200.00),
((SELECT id FROM public.hotels WHERE name = 'Four Seasons Resort Dubai'), 'Premier Room', 2, 1, 600.00, 150.00),
((SELECT id FROM public.hotels WHERE name = 'Four Seasons Resort Dubai'), 'Suite', 3, 1, 1200.00, 150.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.tours (name, description, tour_type, duration, cost_per_person, private_transfer_cost) VALUES
('Dubai City Tour', 'Explore Dubai''s iconic landmarks including Burj Khalifa, Dubai Mall, and traditional souks', 'group', 'Full Day', 150.00, 300.00),
('Desert Safari Adventure', 'Thrilling desert experience with dune bashing, camel riding, and traditional dinner', 'group', 'Half Day', 200.00, 400.00),
('Dubai Marina Cruise', 'Luxury yacht cruise through Dubai Marina with stunning skyline views', 'group', 'Evening', 180.00, 350.00),
('Private City Tour', 'Personalized exploration of Dubai with dedicated guide and luxury vehicle', 'private', 'Full Day', 300.00, 0.00),
('Helicopter Tour', 'Aerial view of Dubai''s landmarks including Burj Al Arab, Palm Jumeirah, and Burj Khalifa', 'group', '15 minutes', 500.00, 200.00)
ON CONFLICT (name) DO NOTHING;

-- Generate reference number function
CREATE OR REPLACE FUNCTION generate_reference_number() 
RETURNS TEXT AS $$
BEGIN
  RETURN 'QT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;