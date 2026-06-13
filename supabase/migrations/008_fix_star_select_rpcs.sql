-- 008_fix_star_select_rpcs.sql
-- Funciones que usaban SELECT tbl.* y fallaban por desajuste con el RETURNS TABLE
-- (orden/conteo de columnas). Se reescriben con listas de columnas explícitas.

-- get_reservation_by_id: b.* + ba.* generaba columnas de más (ba.id) y orden distinto
CREATE OR REPLACE FUNCTION get_reservation_by_id(p_booking_id UUID, p_driver_id UUID)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  booking_id UUID, driver_id UUID, assigned_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ,
  confirmed_plate TEXT, confirmed_phone TEXT, substitute_plate TEXT,
  substitute_phone TEXT, has_substitute BOOLEAN,
  origin_station_name TEXT, client_name TEXT, client_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.client_id, b.origin_station_id, b.destination_address,
         b.destination_lat, b.destination_lng, b.destination_station_id,
         b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
         b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
         b.needs_large_vehicle, b.base_price, b.total_price, b.status,
         b.cancelled_at, b.cancelled_by, b.cancellation_reason,
         b.stripe_payment_intent_id, b.created_at, b.updated_at,
         ba.booking_id, ba.driver_id, ba.assigned_at, ba.confirmed_at,
         ba.confirmed_plate, ba.confirmed_phone, ba.substitute_plate,
         ba.substitute_phone, ba.has_substitute,
         s.name AS origin_station_name, u.full_name AS client_name, u.phone AS client_phone
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  LEFT JOIN users u ON u.id = b.client_id
  WHERE ba.booking_id = p_booking_id AND ba.driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- get_driver_payout_data: la declaración omite member_since pero d.* lo incluía
CREATE OR REPLACE FUNCTION get_driver_payout_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ,
  email TEXT, full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.is_exempt, d.is_active, d.last_assigned_at, d.stripe_account_id,
         d.created_at, u.email, u.full_name
  FROM drivers d JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- notify_driver_data: mismo problema que get_driver_payout_data + phone
CREATE OR REPLACE FUNCTION notify_driver_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ,
  email TEXT, full_name TEXT, phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.is_exempt, d.is_active, d.last_assigned_at, d.stripe_account_id,
         d.created_at, u.email, u.full_name, u.phone
  FROM drivers d JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_reservation_by_id(UUID, UUID), get_driver_payout_data(UUID), notify_driver_data(UUID) TO service_role, anon, authenticated;
