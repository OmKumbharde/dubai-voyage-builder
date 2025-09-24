-- Fix tours table structure and add missing fields
ALTER TABLE tours DROP COLUMN IF EXISTS tour_type;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'group';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS transfer_included boolean DEFAULT true;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Create inclusions table for managing various costs
CREATE TABLE IF NOT EXISTS public.inclusions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other', -- 'visa', 'transfer', 'insurance', 'other'
  cost numeric NOT NULL DEFAULT 0,
  description text,
  is_optional boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for inclusions
ALTER TABLE public.inclusions ENABLE ROW LEVEL SECURITY;

-- Create policies for inclusions
CREATE POLICY "Enable all access for authenticated users inclusions" 
ON public.inclusions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create hotel_rates table for calendar-based rate management
CREATE TABLE IF NOT EXISTS public.hotel_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  date date NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  inventory integer DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, room_type, date)
);

-- Enable RLS for hotel_rates
ALTER TABLE public.hotel_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for hotel_rates
CREATE POLICY "Enable all access for authenticated users hotel_rates" 
ON public.hotel_rates 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update triggers for new tables
CREATE TRIGGER update_inclusions_updated_at
BEFORE UPDATE ON public.inclusions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotel_rates_updated_at
BEFORE UPDATE ON public.hotel_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample inclusions data
INSERT INTO public.inclusions (name, type, cost, description, is_optional) VALUES
('Dubai Visa Processing', 'visa', 120, 'Tourist visa processing for Dubai', false),
('Airport Transfer (Private)', 'transfer', 80, 'Private airport pickup and drop-off', true),
('Airport Transfer (Shared)', 'transfer', 35, 'Shared airport transfer service', true),
('Hotel to Hotel Transfer', 'transfer', 50, 'Transfer between hotels in Dubai', true), 
('Intercity Transfer (Dubai to Abu Dhabi)', 'transfer', 150, 'Private transfer to Abu Dhabi', true),
('Travel Insurance', 'insurance', 25, 'Comprehensive travel insurance coverage', true),
('City Tour Guide', 'other', 100, 'Professional tour guide for city tours', true),
('Meal Plan Upgrade', 'other', 75, 'Upgrade to full board meal plan', true)
ON CONFLICT DO NOTHING;