-- Add private_transfer_cost column to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS private_transfer_cost numeric DEFAULT 0;

-- Insert some sample tours to test
INSERT INTO public.tours (name, description, type, duration, cost_per_person, transfer_included, private_transfer_cost, highlights, images) VALUES
('Dubai City Tour', 'Explore the highlights of Dubai including Burj Khalifa, Dubai Mall, and Gold Souks', 'group', '6 Hours', 150, true, 0, ARRAY['Burj Khalifa', 'Dubai Mall', 'Gold Souk', 'Spice Souk'], ARRAY['/api/placeholder/400/300']),
('Private Desert Safari', 'Exclusive desert experience with dune bashing, camel riding, and BBQ dinner', 'private', '8 Hours', 300, true, 200, ARRAY['Dune Bashing', 'Camel Riding', 'BBQ Dinner', 'Traditional Shows'], ARRAY['/api/placeholder/400/300']),
('Dhow Cruise Marina', 'Relaxing cruise along Dubai Marina with buffet dinner', 'group', '3 Hours', 120, true, 0, ARRAY['Marina Views', 'Buffet Dinner', 'Live Entertainment'], ARRAY['/api/placeholder/400/300'])
ON CONFLICT DO NOTHING;