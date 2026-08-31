-- ============================================================
-- 032 — Recreate driver_fixed_routes with free text columns
-- ============================================================
-- Como la migración 031 ya se aplicó con el esquema antiguo (solo paradas),
-- recreamos la tabla para incluir columnas de texto libre (dest_label, origin_label, etc).
-- Como la tabla está vacía, un DROP es seguro.
-- ============================================================

DROP TABLE IF EXISTS driver_fixed_routes CASCADE;

CREATE TABLE driver_fixed_routes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

  origin_label      TEXT NOT NULL,
  origin_lat        DECIMAL(9,6),
  origin_lng        DECIMAL(9,6),
  origin_station_id UUID REFERENCES stations(id) ON DELETE SET NULL,

  dest_label        TEXT NOT NULL,
  dest_lat          DECIMAL(9,6),
  dest_lng          DECIMAL(9,6),
  dest_station_id   UUID REFERENCES stations(id) ON DELETE SET NULL,

  price             NUMERIC(8,2) NOT NULL CHECK (price > 0),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dfr_driver ON driver_fixed_routes (driver_id);
CREATE INDEX IF NOT EXISTS idx_dfr_stations ON driver_fixed_routes (origin_station_id, dest_station_id)
  WHERE origin_station_id IS NOT NULL AND dest_station_id IS NOT NULL;

ALTER TABLE driver_fixed_routes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON driver_fixed_routes TO service_role;
GRANT ALL ON driver_fixed_routes TO anon;
GRANT ALL ON driver_fixed_routes TO authenticated;
