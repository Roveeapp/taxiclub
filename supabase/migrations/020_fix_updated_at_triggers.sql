-- ============================================================
-- 020 — Fix: record "new" has no field "updated_at"
-- ============================================================
-- En la BD existe un trigger genérico (update_updated_at_column)
-- creado fuera de las migraciones y adjuntado a varias tablas.
-- En las tablas SIN columna updated_at, cualquier UPDATE falla con:
--   record "new" has no field "updated_at"
-- (ya pasó con drivers → migración 009; ahora con vehicles /
--  booking_assignments al editar vehículos o reasignar reservas).
--
-- Solución universal: recorrer todos los triggers de ese tipo en el
-- esquema public y añadir la columna updated_at a las tablas que no
-- la tengan. Idempotente.
--
-- Además se recrean los dos RPCs de stations que usan s.* con tipo
-- fijo, para que no se rompan si stations gana la columna (el mismo
-- bug de siempre con SELECT *).
-- ============================================================

-- 1. Añadir updated_at a toda tabla que tenga un trigger de updated_at
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND p.proname IN ('update_updated_at_column', 'set_updated_at', 'handle_updated_at', 'moddatetime', 'touch_updated_at')
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
      r.table_name
    );
    RAISE NOTICE 'updated_at asegurada en public.%', r.table_name;
  END LOOP;
END $$;

-- 2. Por si acaso, las dos tablas donde el error se ha reproducido
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.booking_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. RPCs de stations con listas explícitas (usaban s.* con RETURNS fijo)
DROP FUNCTION IF EXISTS get_driver_stations(UUID);

CREATE OR REPLACE FUNCTION get_driver_stations(p_driver_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, city TEXT, address TEXT, lat DECIMAL, lng DECIMAL,
  is_active BOOLEAN, created_at TIMESTAMPTZ, joined_at TIMESTAMPTZ, is_active_ds BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.city, s.address, s.lat, s.lng,
         s.is_active, s.created_at,
         ds.joined_at, ds.is_active AS is_active_ds
  FROM driver_stations ds
  JOIN stations s ON s.id = ds.station_id
  WHERE ds.driver_id = p_driver_id
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

DROP FUNCTION IF EXISTS get_admin_stations();

CREATE OR REPLACE FUNCTION get_admin_stations()
RETURNS TABLE (
  id UUID, name TEXT, city TEXT, address TEXT, lat DECIMAL, lng DECIMAL,
  is_active BOOLEAN, created_at TIMESTAMPTZ,
  driver_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.city, s.address, s.lat, s.lng,
         s.is_active, s.created_at,
         (SELECT COUNT(*) FROM driver_stations ds WHERE ds.station_id = s.id AND ds.is_active = TRUE) AS driver_count
  FROM stations s
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;
