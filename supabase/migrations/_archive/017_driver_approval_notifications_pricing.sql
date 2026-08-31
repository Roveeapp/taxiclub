-- ============================================================
-- 017 — Aprobación de taxistas, notificaciones a invitados,
--        recordatorios con datos y tarifas por distancia
-- ============================================================
-- 1. drivers.is_approved: los taxistas nuevos requieren aprobación
--    del admin antes de recibir asignaciones. Los existentes se
--    aprueban automáticamente.
-- 2. get_driver_for_assignment filtra por is_approved.
-- 3. get_admin_drivers / get_driver_payout_data devuelven is_approved.
-- 4. notify_client_*_data soportan reservas de invitados (guest_email).
-- 5. get_unconfirmed_assignments_v2 devuelve email y datos del viaje
--    (para que la edge function envíe recordatorios reales).
-- 6. Tarifas por distancia en system_config (base_fare, price_per_km,
--    min_fare) usadas cuando no hay precio fijo de ruta.
-- ============================================================

-- 1. Columna de aprobación
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
UPDATE drivers SET is_approved = TRUE WHERE is_approved IS DISTINCT FROM TRUE;
COMMENT ON COLUMN drivers.is_approved IS 'Aprobado por el admin. Sin aprobación no recibe asignaciones.';

-- 2. Round-robin solo con aprobados
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
BEGIN
  station_ids := ARRAY[p_origin_station_id];
  IF p_destination_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_destination_station_id);
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (d.id)
    d.id,
    d.last_assigned_at,
    v.id AS vehicle_id,
    v.plate
  FROM drivers d
  JOIN driver_stations ds ON d.id = ds.driver_id
  JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE
    ds.station_id = ANY(station_ids)
    AND ds.is_active = TRUE
    AND d.is_active = TRUE
    AND d.is_approved = TRUE
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
    AND NOT EXISTS (
      SELECT 1 FROM driver_availability da
      WHERE da.driver_id = d.id
        AND da.date = p_pickup_at::date
        AND da.is_available = FALSE
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. RPCs de admin con is_approved
DROP FUNCTION IF EXISTS get_admin_drivers();

CREATE OR REPLACE FUNCTION get_admin_drivers()
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  custom_monthly_fee NUMERIC, custom_commission_pct NUMERIC, is_approved BOOLEAN,
  email TEXT, full_name TEXT, phone TEXT, vehicle_count BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct, d.is_approved,
         u.email, u.full_name, u.phone,
         (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
  FROM drivers d
  JOIN users u ON u.id = d.id
  ORDER BY d.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS get_driver_payout_data(UUID);

CREATE OR REPLACE FUNCTION get_driver_payout_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  custom_monthly_fee NUMERIC, custom_commission_pct NUMERIC, is_approved BOOLEAN,
  email TEXT, full_name TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct, d.is_approved,
         u.email, u.full_name
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$;

-- 4. Notificaciones también para invitados
CREATE OR REPLACE FUNCTION notify_client_confirmed_data(p_booking_id UUID)
RETURNS TABLE (
  id UUID, email TEXT, confirmed_plate TEXT, confirmed_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, COALESCE(u.email, b.guest_email) AS email, ba.confirmed_plate, ba.confirmed_phone
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  JOIN booking_assignments ba ON ba.booking_id = b.id
  WHERE b.id = p_booking_id
    AND COALESCE(u.email, b.guest_email) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_client_cancelled_data(p_booking_id UUID)
RETURNS TABLE (email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(u.email, b.guest_email) AS email
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  WHERE b.id = p_booking_id
    AND COALESCE(u.email, b.guest_email) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Recordatorios con datos completos (edge function remind-unconfirmed)
CREATE OR REPLACE FUNCTION get_unconfirmed_assignments_v2(p_threshold TIMESTAMPTZ)
RETURNS TABLE (
  id UUID, driver_id UUID, booking_id UUID,
  driver_email TEXT, driver_name TEXT,
  origin_station_name TEXT, destination_address TEXT, pickup_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ba.id, ba.driver_id, b.id AS booking_id,
         u.email AS driver_email, u.full_name AS driver_name,
         s.name AS origin_station_name, b.destination_address, b.pickup_at
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  JOIN users u ON u.id = ba.driver_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.status = 'pending'
    AND ba.confirmed_at IS NULL
    AND ba.assigned_at < p_threshold;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_unconfirmed_assignments_v2(TIMESTAMPTZ) TO service_role;

-- 6. Tarifas por distancia (fallback cuando no hay precio fijo de ruta)
INSERT INTO system_config (key, value) VALUES
  ('base_fare', '4'::jsonb),
  ('price_per_km', '1.2'::jsonb),
  ('min_fare', '10'::jsonb)
ON CONFLICT (key) DO NOTHING;
