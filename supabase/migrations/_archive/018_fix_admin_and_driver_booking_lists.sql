-- ============================================================
-- 018 — Fix: listados de reservas (admin y taxista) vacíos
-- ============================================================
-- get_admin_bookings y get_driver_reservations usaban SELECT b.*
-- con un RETURNS TABLE fijo. La migración 012 añadió guest_name,
-- guest_email y guest_phone a bookings, desincronizando ambos RPCs:
-- fallaban con "structure of query does not match function result
-- type" y los listados aparecían vacíos.
-- Se recrean con listas explícitas de columnas (incluyendo los
-- campos guest) y el admin muestra el nombre del invitado cuando
-- la reserva no tiene cuenta asociada.
-- ============================================================

-- 1. Listado de reservas del admin
DROP FUNCTION IF EXISTS get_admin_bookings(TEXT, DATE);

CREATE OR REPLACE FUNCTION get_admin_bookings(p_status TEXT, p_date DATE)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  guest_name TEXT, guest_email TEXT, guest_phone TEXT,
  client_name TEXT, client_email TEXT,
  driver_id UUID, confirmed_plate TEXT, confirmed_phone TEXT,
  origin_station_name TEXT
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
         b.guest_name, b.guest_email, b.guest_phone,
         COALESCE(u.full_name, b.guest_name) AS client_name,
         COALESCE(u.email, b.guest_email) AS client_email,
         ba.driver_id, ba.confirmed_plate, ba.confirmed_phone,
         s.name AS origin_station_name
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE (p_status IS NULL OR b.status = p_status)
    AND (p_date IS NULL OR b.pickup_at::date = p_date)
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. Listado de reservas del taxista
DROP FUNCTION IF EXISTS get_driver_reservations(UUID);

CREATE OR REPLACE FUNCTION get_driver_reservations(p_driver_id UUID)
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
  has_substitute BOOLEAN, substitute_plate TEXT, substitute_phone TEXT,
  origin_station_name TEXT
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
         b.guest_name, b.guest_email, b.guest_phone,
         ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, ba.has_substitute,
         ba.substitute_plate, ba.substitute_phone,
         s.name AS origin_station_name
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE ba.driver_id = p_driver_id
  ORDER BY b.pickup_at DESC;
END;
$$ LANGUAGE plpgsql;
