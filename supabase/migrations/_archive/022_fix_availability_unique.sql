-- ============================================================
-- 022 — Fix: ON CONFLICT en driver_availability
-- ============================================================
-- El upsert de disponibilidad usa ON CONFLICT (driver_id, date),
-- pero la tabla en la BD no tiene esa restricción única (aunque
-- 001 la declaraba, la tabla real se creó sin ella), y falla con:
--   "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification"
-- Se eliminan posibles duplicados y se crea el índice único.
-- ============================================================

-- 1. Deduplicar por si hay filas repetidas (se conserva una por día)
DELETE FROM driver_availability a
USING driver_availability b
WHERE a.driver_id = b.driver_id
  AND a.date = b.date
  AND a.id > b.id;

-- 2. Índice único que satisface el ON CONFLICT (driver_id, date)
CREATE UNIQUE INDEX IF NOT EXISTS driver_availability_driver_date_key
  ON driver_availability (driver_id, date);
