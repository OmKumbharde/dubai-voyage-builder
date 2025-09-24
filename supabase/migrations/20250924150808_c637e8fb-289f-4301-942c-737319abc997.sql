-- Add base_rate column to hotels table
ALTER TABLE public.hotels ADD COLUMN base_rate numeric DEFAULT 500;