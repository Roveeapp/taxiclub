-- ============================================================
-- 021 — Disponibilidad con franjas horarias múltiples
-- ============================================================
-- 1. driver_availability.time_slots (JSONB): array de franjas
--    [{"from":"09:00","to":"15:00"},{"from":"16:00","to":"20:00"}]
--    Semántica:
--      is_available = FALSE            → día completo NO disponible
--      is_available = TRUE  sin slots  → disponible todo el día
--      is_available = TRUE  con slots  → disponible SOLO en esas franjas
--    Se migran los antiguos hour_from/hour_to a una franja.
-- 2. get_driver_for_assignment respeta las franjas: solo asigna si la
--    hora de recogida (Europe/Madrid) cae dentro de alguna franja.
-- ============================================================

-- 1. Columna + backfill del formato antiguo
ALTER TABLE driver_availability ADD COLUMN IF NOT EXISTS time_slots JSONB;

UPDATE driver_availability
SET time_slots = jsonb_build_array(
  jsonb_build_object(
    'from', to_char(hour_from, 'HH24:MI'),
    'to',   to_char(hour_to, 'HH24:MI')
  )
)
WHERE time_slots IS NULL
  AND hour_from IS NOT NULL
  AND hour_to IS NOT NULL;

-- 2. Asignación respetando franjas
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
  station_ids := ARRAY[p_origin_station_id];
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
        AND da.date = pickup_local::date
        AND (
          -- Día completo no disponible
          da.is_available = FALSE
          -- O disponible solo por franjas y la hora no cae en ninguna
          OR (
            da.time_slots IS NOT NULL
            AND jsonb_typeof(da.time_slots) = 'array'
            AND jsonb_array_length(da.time_slots) > 0
            AND NOT EXISTS (
              SELECT 1 FROM jsonb_array_elements(da.time_slots) AS slot
              WHERE pickup_local::time >= (slot.value->>'from')::time
                AND pickup_local::time <= (slot.value->>'to')::time
            )
          )
        )
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
