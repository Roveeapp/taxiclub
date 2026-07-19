-- ============================================================
-- 019 — Fotos de vehículos
-- ============================================================
-- 1. vehicles.photo_url para la foto del vehículo.
-- 2. Recrea get_vehicles_with_accessories / get_vehicle_with_accessories
--    con listas explícitas (usaban v.* con RETURNS TABLE fijo — se
--    romperían al añadir la columna, el mismo bug de siempre).
-- 3. Bucket público de Storage para servir las fotos.
-- ============================================================

-- 1. Columna
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2a. Listado de vehículos del taxista
DROP FUNCTION IF EXISTS get_vehicles_with_accessories(UUID);

CREATE OR REPLACE FUNCTION get_vehicles_with_accessories(p_driver_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, plate TEXT, brand TEXT, model TEXT, year INT,
  color TEXT, max_passengers INT, max_luggage_big INT, max_luggage_hand INT,
  has_child_seat BOOLEAN, has_pet_friendly BOOLEAN, is_accessible BOOLEAN,
  is_large_vehicle BOOLEAN, is_active BOOLEAN, created_at TIMESTAMPTZ,
  photo_url TEXT, accessories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.driver_id, v.plate, v.brand, v.model, v.year,
         v.color, v.max_passengers, v.max_luggage_big, v.max_luggage_hand,
         v.has_child_seat, v.has_pet_friendly, v.is_accessible,
         v.is_large_vehicle, v.is_active, v.created_at,
         v.photo_url,
         COALESCE(
           jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
             FILTER (WHERE a.id IS NOT NULL),
           '[]'::jsonb
         ) AS accessories
  FROM vehicles v
  LEFT JOIN vehicle_accessories va ON va.vehicle_id = v.id
  LEFT JOIN accessories a ON a.id = va.accessory_id
  WHERE v.driver_id = p_driver_id AND v.is_active = TRUE
  GROUP BY v.id
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2b. Detalle de un vehículo
DROP FUNCTION IF EXISTS get_vehicle_with_accessories(UUID, UUID);

CREATE OR REPLACE FUNCTION get_vehicle_with_accessories(p_id UUID, p_driver_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, plate TEXT, brand TEXT, model TEXT, year INT,
  color TEXT, max_passengers INT, max_luggage_big INT, max_luggage_hand INT,
  has_child_seat BOOLEAN, has_pet_friendly BOOLEAN, is_accessible BOOLEAN,
  is_large_vehicle BOOLEAN, is_active BOOLEAN, created_at TIMESTAMPTZ,
  photo_url TEXT, accessories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.driver_id, v.plate, v.brand, v.model, v.year,
         v.color, v.max_passengers, v.max_luggage_big, v.max_luggage_hand,
         v.has_child_seat, v.has_pet_friendly, v.is_accessible,
         v.is_large_vehicle, v.is_active, v.created_at,
         v.photo_url,
         COALESCE(
           jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
             FILTER (WHERE a.id IS NOT NULL),
           '[]'::jsonb
         ) AS accessories
  FROM vehicles v
  LEFT JOIN vehicle_accessories va ON va.vehicle_id = v.id
  LEFT JOIN accessories a ON a.id = va.accessory_id
  WHERE v.id = p_id AND v.driver_id = p_driver_id
  GROUP BY v.id;
END;
$$ LANGUAGE plpgsql;

-- 3. Bucket público para fotos de vehículos (la subida la hace el
--    servidor con service role; la lectura es pública por URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehicle-photos', 'vehicle-photos', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;
