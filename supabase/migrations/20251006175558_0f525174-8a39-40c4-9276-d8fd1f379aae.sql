-- Add category field to hotels table to distinguish between hotels and apartments
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS category text DEFAULT 'hotel' CHECK (category IN ('hotel', 'apartment'));

-- Add comment to explain the field
COMMENT ON COLUMN hotels.category IS 'Type of accommodation: hotel or apartment';