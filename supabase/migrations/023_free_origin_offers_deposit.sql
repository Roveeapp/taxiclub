-- ============================================================
-- 023 — Origen libre, señal en ofertas y reglas de disponibilidad
-- ============================================================
-- 1. bookings.origin_address (texto libre) y origin_station_id opcional.
--    bookings.deposit_amount (señal 10% en ofertas) y bookings.offer_id.
-- 2. get_driver_for_assignment:
--      · origen sin parada → puede asignarse a cualquier taxista apto.
--      · disponibilidad: SOLO bloquea el día completo no disponible;
--        los días con franjas SÍ reciben reservas (las franjas son
--        informativas para la asignación).
-- 3. RPCs de reservas devuelven origin_address y deposit_amount.
-- ============================================================

-- 1. Columnas nuevas
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS origin_address TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES return_offers(id);

ALTER TABLE bookings ALTER COLUMN origin_station_id DROP NOT NULL;

COMMENT ON COLUMN bookings.origin_address IS 'Origen en texto libre (si no hay parada)';
COMMENT ON COLUMN bookings.deposit_amount IS 'Señal pre-autorizada vía Stripe (reservas de ofertas). NULL = pago completo';
COMMENT ON COLUMN bookings.offer_id IS 'Oferta de Última Hora reservada, si aplica';

-- 2. Asignación: origen libre + franjas no bloquean
CREATE OR REPLACE FUNCTION get_driver_for_assignment(
  p_origin_station_id UUID,
  p_destination_station_id UUID,
  p_passengers INT,
  p_luggage_big INT,
  p_luggage_hand INT,
  p_needs_child_seat BOOLEAN,
  p_needs_pet_friendly BOOLEAN,
  p_needs_accessible BOOLEAN,
  p_needs_large_vehicle BOOLEAN,
  p_pickup_at TIMESTAMPTZ
) RETURNS TABLE (
  id UUID,
  last_assigned_at TIMESTAMPTZ,
  vehicle_id UUID,
  plate TEXT
) AS $$
DECLARE
  station_ids UUID[];
  pickup_local TIMESTAMP;
BEGIN
  station_ids := ARRAY[]::UUID[];
  IF p_origin_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_origin_station_id);
  END IF;
  IF p_destination_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_destination_station_id);
  END IF;

  pickup_local := p_pickup_at AT TIME ZONE 'Europe/Madrid';

  RETURN QUERY
  SELECT DISTINCT ON (d.id)
    d.id,
    d.last_assigned_at,
    v.id AS vehicle_id,
    v.plate
  FROM drivers d
  JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE
    d.is_active = TRUE
    AND d.is_approved = TRUE
    -- Sin paradas implicadas (origen libre) cualquier taxista es apto;
    -- con paradas, debe estar afiliado a alguna de ellas.
    AND (
      cardinality(station_ids) = 0
      OR EXISTS (
        SELECT 1 FROM driver_stations ds
        WHERE ds.driver_id = d.id
          AND ds.is_active = TRUE
          AND ds.station_id = ANY(station_ids)
      )
    )
    AND v.max_passengers >= p_passengers
    AND v.max_luggage_big >= p_luggage_big
    AND v.max_luggage_hand >= p_luggage_hand
    AND (p_needs_child_seat = FALSE OR v.has_child_seat = TRUE)
    AND (p_needs_pet_friendly = FALSE OR v.has_pet_friendly = TRUE)
    AND (p_needs_accessible = FALSE OR v.is_accessible = TRUE)
    AND (p_needs_large_vehicle = FALSE OR v.is_large_vehicle = TRUE)
    AND NOT EXISTS (
      SELECT 1 FROM booking_assignments ba
      JOIN bookings b ON b.id = ba.booking_id
      WHERE ba.driver_id = d.id
        AND b.status IN ('pending','confirmed')
        AND b.pickup_at BETWEEN (p_pickup_at - INTERVAL '3 hours')
                            AND (p_pickup_at + INTERVAL '3 hours')
    )
    -- Solo bloquea el día completo marcado como no disponible
    AND NOT EXISTS (
      SELECT 1 FROM driver_availability da
      WHERE da.driver_id = d.id
        AND da.date = pickup_local::date
        AND da.is_available = FALSE
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3a. get_booking_by_id con origin_address y deposit_amount
DROP FUNCTION IF EXISTS get_booking_by_id(UUID, UUID);

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
  origin_address TEXT, deposit_amount DECIMAL, offer_id UUID,
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
    b.origin_address, b.deposit_amount, b.offer_id,
    ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at,
    s.name AS origin_station_name
  FROM bookings b
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.id = p_id
    AND (
      b.client_id IS NULL
      OR b.client_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_booking_by_id(UUID, UUID) TO service_role, anon, authenticated;

-- 3b. get_admin_bookings con origin_address y deposit_amount
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
  origin_address TEXT, deposit_amount DECIMAL,
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
         b.origin_address, b.deposit_amount,
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

-- 3c. get_driver_reservations con origin_address y deposit_amount
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
  origin_address TEXT, deposit_amount DECIMAL,
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
         b.origin_address, b.deposit_amount,
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
