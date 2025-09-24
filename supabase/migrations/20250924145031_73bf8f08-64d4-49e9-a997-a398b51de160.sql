-- Remove the room_type column from hotel_rates table (if it exists)
ALTER TABLE hotel_rates DROP COLUMN IF EXISTS room_type;

-- Update the unique constraint to be on hotel_id and date only
DROP INDEX IF EXISTS hotel_rates_hotel_id_date_idx;
CREATE UNIQUE INDEX hotel_rates_hotel_id_date_idx ON hotel_rates (hotel_id, date);

-- Also drop the hotel_rooms table as it's no longer needed
DROP TABLE IF EXISTS hotel_rooms;