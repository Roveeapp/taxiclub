-- 012_guest_bookings.sql

-- 1. Modify bookings table
ALTER TABLE bookings ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- 2. Drop the old function because we are changing the return TABLE signature
DROP FUNCTION IF EXISTS get_booking_by_id(UUID, UUID);

-- 3. Recreate the function with new columns and new logic
CREATE OR REPLACE FUNCTION get_booking_by_id(p_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  guest_name TEXT, guest_email TEXT, guest_phone TEXT,
  confirmed_plate TEXT, confirmed_phone TEXT, confirmed_at TIMESTAMPTZ,
  origin_station_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, b.client_id, b.origin_station_id, b.destination_address,
    b.destination_lat, b.destination_lng, b.destination_station_id,
    b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
    b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
    b.needs_large_vehicle, b.base_price, b.total_price, b.status,
    b.cancelled_at, b.cancelled_by, b.cancellation_reason,
    b.stripe_payment_intent_id, b.created_at, b.updated_at,
    b.guest_name, b.guest_email, b.guest_phone,
    ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, 
    s.name as origin_station_name
  FROM bookings b
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.id = p_id 
    AND (
      b.client_id = p_user_id OR 
      b.client_id IS NULL
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_booking_by_id(UUID, UUID) TO service_role, anon, authenticated;
