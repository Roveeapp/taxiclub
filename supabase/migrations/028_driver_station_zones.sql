-- ============================================================
-- 028 — Zonas de radio por parada (por conductor)
-- ============================================================
-- Cada taxista define anillos circulares desde su parada:
--   · mode = 'exclude'      → en ese rango de km NO acepta reservas
--   · mode = 'fixed_price'  → en ese rango cobra un precio fijo
-- Ej.: Aeropuerto, 0–10 km excluido; 10–20 km a 17 €.
--
-- La exclusión se aplica en la asignación (el conductor no recibe
-- reservas cuyo destino caiga en su anillo excluido). El precio
-- fijo se aplica al presupuesto cuando ese conductor es el que
-- recibiría la reserva. Distancias en línea recta (radio circular).
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_station_zones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id      UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  station_id     UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  radius_from_km NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (radius_from_km >= 0),
  radius_to_km   NUMERIC(6,1) NOT NULL CHECK (radius_to_km > 0),
  mode           TEXT NOT NULL CHECK (mode IN ('exclude', 'fixed_price')),
  fixed_price    NUMERIC(8,2) CHECK (fixed_price IS NULL OR fixed_price > 0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (radius_to_km > radius_from_km),
  CHECK (mode <> 'fixed_price' OR fixed_price IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_dsz_driver_station ON driver_station_zones (driver_id, station_id);

-- Solo el servidor accede (el taxista a través de la API)
ALTER TABLE driver_station_zones ENABLE ROW LEVEL SECURITY;

-- Distancia en línea recta (km) — fórmula haversine
CREATE OR REPLACE FUNCTION haversine_km(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians((lng2 - lng1) / 2)), 2)
  ))
$$;

-- Asignación con exclusión por zonas (nuevos parámetros de destino)
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
  p_dest_lng DECIMAL DEFAULT NULL
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
    -- Zonas excluidas: si el destino cae en un anillo 'exclude' del
    -- conductor medido desde la parada de origen, no se le asigna.
    AND NOT (
      p_origin_station_id IS NOT NULL
      AND p_dest_lat IS NOT NULL
      AND p_dest_lng IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM driver_station_zones z
        JOIN stations s ON s.id = z.station_id
        WHERE z.driver_id = d.id
          AND z.station_id = p_origin_station_id
          AND z.mode = 'exclude'
          AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND haversine_km(s.lat, s.lng, p_dest_lat, p_dest_lng) >= z.radius_from_km
          AND haversine_km(s.lat, s.lng, p_dest_lat, p_dest_lng) < z.radius_to_km
      )
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
