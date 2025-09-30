-- Add pickup and drop-off time fields to tours table
ALTER TABLE public.tours 
ADD COLUMN pickup_time text,
ADD COLUMN drop_time text;

-- Update existing tours with default times
UPDATE public.tours 
SET pickup_time = '09:00 AM', 
    drop_time = '05:00 PM' 
WHERE pickup_time IS NULL;