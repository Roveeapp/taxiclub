-- 009_fix_drivers_updated_at.sql
-- La tabla drivers fue creada sin columna updated_at, pero el trigger
-- trg_drivers_updated_at (que ejecuta update_updated_at_column) ya existía
-- en la BD y lanzaba "record new has no field updated_at" al hacer PATCH.
-- Añadimos la columna para que el trigger funcione correctamente.

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
