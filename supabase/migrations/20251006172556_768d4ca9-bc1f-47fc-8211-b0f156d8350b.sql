-- Add tiered private transfer pricing columns to tours table
ALTER TABLE tours 
DROP COLUMN IF EXISTS private_transfer_cost;

ALTER TABLE tours
ADD COLUMN transfer_price_1_5_pax numeric DEFAULT 0,
ADD COLUMN transfer_price_6_12_pax numeric DEFAULT 0,
ADD COLUMN transfer_price_13_22_pax numeric DEFAULT 0;