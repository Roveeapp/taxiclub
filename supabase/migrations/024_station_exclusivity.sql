-- ============================================================
-- 024 — Exclusividad de taxista por parada
-- ============================================================
-- Todo viaje cuyo origen o destino sea una parada con exclusividad
-- se asigna SIEMPRE al taxista elegido por el admin (si está activo
-- y aprobado); si no puede, cae al round-robin normal.
--
-- Privacidad: la tabla tiene RLS activado SIN políticas → solo el
-- service role (servidor) puede leerla. Ni clientes ni taxistas
-- pueden ver esta configuración por la API pública de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS station_exclusivities (
  station_id UUID PRIMARY KEY REFERENCES stations(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE station_exclusivities ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo service role. (No crear políticas aquí a propósito.)

-- Asignación con prioridad de exclusividad
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
  exclusive_driver UUID;
BEGIN
  station_ids := ARRAY[]::UUID[];
  IF p_origin_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_origin_station_id);
  END IF;
  IF p_destination_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_destination_station_id);
  END IF;

  pickup_local := p_pickup_at AT TIME ZONE 'Europe/Madrid';

  -- 1. ¿Alguna parada implicada tiene taxista exclusivo?
  IF cardinality(station_ids) > 0 THEN
    SELECT se.driver_id INTO exclusive_driver
    FROM station_exclusivities se
    WHERE se.station_id = ANY(station_ids)
    LIMIT 1;

    IF exclusive_driver IS NOT NULL THEN
      RETURN QUERY
      SELECT d.id, d.last_assigned_at, v.id AS vehicle_id, v.plate
      FROM drivers d
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      WHERE d.id = exclusive_driver
        AND d.is_active = TRUE
        AND d.is_approved = TRUE
      ORDER BY v.created_at ASC
      LIMIT 1;

      IF FOUND THEN
        RETURN;
      END IF;
      -- Si el exclusivo no está operativo, seguimos con el reparto normal
    END IF;
  END IF;

  -- 2. Round-robin normal
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
