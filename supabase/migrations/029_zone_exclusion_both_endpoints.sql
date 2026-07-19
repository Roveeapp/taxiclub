-- ============================================================
-- 029 — Exclusión de zona: el VIAJE COMPLETO dentro del anillo
-- ============================================================
-- Aclaración de la regla: un anillo 'exclude' descarta al conductor
-- cuando ORIGEN y DESTINO caen ambos dentro del anillo (medido desde
-- su parada). Ej.: exclusión 0–10 km en el Aeropuerto:
--   · Aeropuerto → destino a 8 km   → excluido (todo dentro)
--   · Aeropuerto → destino a 11 km  → aceptado (el destino sale)
-- Si el origen es la propia parada del anillo, su distancia es 0.
-- Con origen libre se usan sus coordenadas (nuevos parámetros).
-- Los anillos 'fixed_price' no cambian: origen en la parada y
-- destino dentro del rango.
--
-- Además: bookings.origin_lat/lng para guardar el origen geocodificado.
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS origin_lat DECIMAL(9,6),
  ADD COLUMN IF NOT EXISTS origin_lng DECIMAL(9,6);

DROP FUNCTION IF EXISTS get_driver_for_assignment(UUID, UUID, INT, INT, INT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TIMESTAMPTZ, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS get_driver_for_assignment(UUID, UUID, INT, INT, INT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TIMESTAMPTZ);

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
  p_pickup_at TIMESTAMPTZ,
  p_dest_lat DECIMAL DEFAULT NULL,
  p_dest_lng DECIMAL DEFAULT NULL,
  p_origin_lat DECIMAL DEFAULT NULL,
  p_origin_lng DECIMAL DEFAULT NULL
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

  -- 1. Exclusividad por parada (decisión del admin)
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
    END IF;
  END IF;

  -- 2. Round-robin: solo miembros, respetando zonas excluidas
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
    AND d.is_member = TRUE
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
    -- Anillos excluidos: descarta al conductor si ORIGEN y DESTINO
    -- caen ambos dentro del anillo (desde la parada del anillo).
    AND NOT EXISTS (
      SELECT 1
      FROM driver_station_zones z
      JOIN stations s ON s.id = z.station_id
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN p_origin_station_id = z.station_id THEN 0::double precision
            WHEN p_origin_lat IS NOT NULL AND p_origin_lng IS NOT NULL
              THEN haversine_km(s.lat, s.lng, p_origin_lat, p_origin_lng)
            ELSE NULL
          END AS origin_dist,
          CASE
            WHEN p_dest_lat IS NOT NULL AND p_dest_lng IS NOT NULL
              THEN haversine_km(s.lat, s.lng, p_dest_lat, p_dest_lng)
            ELSE NULL
          END AS dest_dist
      ) dist
      WHERE z.driver_id = d.id
        AND z.mode = 'exclude'
        AND s.lat IS NOT NULL AND s.lng IS NOT NULL
        AND dist.origin_dist IS NOT NULL
        AND dist.dest_dist IS NOT NULL
        AND dist.origin_dist >= z.radius_from_km AND dist.origin_dist < z.radius_to_km
        AND dist.dest_dist >= z.radius_from_km AND dist.dest_dist < z.radius_to_km
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
