-- Add extra bed rate column to hotels table
ALTER TABLE hotels 
ADD COLUMN extra_bed_rate numeric DEFAULT 100;