-- Enable RLS on all tables and add policies
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for hotels
CREATE POLICY "Enable all access for authenticated users" ON public.hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for hotel_rooms
CREATE POLICY "Enable all access for authenticated users" ON public.hotel_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for tours
CREATE POLICY "Enable all access for authenticated users" ON public.tours FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for quotes
CREATE POLICY "Enable all access for authenticated users" ON public.quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for invoices
CREATE POLICY "Enable all access for authenticated users" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);