-- ============================================================
-- 031 — Precios fijos de trayecto (texto libre, por conductor)
-- ============================================================
-- Cada taxista puede definir un precio fijo para un trayecto
-- concreto. Origen y destino son texto libre + coordenadas.
-- Ej.:
--   Aeropuerto de Asturias → Oviedo = 50 €
--   Aeropuerto de Asturias → Avilés = 15 €
--
-- Estos precios tienen PRIORIDAD ABSOLUTA sobre:
--   · Anillos de zona (driver_station_zones con mode='fixed_price')
--   · Tarifa por km (base_fare + price_per_km)
--   · custom_price_per_km del conductor
--
-- Matching: si una reserva tiene origin_station_id o
-- destination_station_id que coinciden con los station_id de la
-- ruta, se usa la ruta. Si no hay station_id, se compara por
-- proximidad de coordenadas (< 3 km).
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_fixed_routes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

  -- Origen: texto libre + coordenadas, opcionalmente vinculado a parada
  origin_label      TEXT NOT NULL,
  origin_lat        DECIMAL(9,6),
  origin_lng        DECIMAL(9,6),
  origin_station_id UUID REFERENCES stations(id) ON DELETE SET NULL,

  -- Destino: texto libre + coordenadas, opcionalmente vinculado a parada
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

-- RLS: solo service_role (el conductor accede a través de la API)
ALTER TABLE driver_fixed_routes ENABLE ROW LEVEL SECURITY;

-- Permisos
GRANT ALL ON driver_fixed_routes TO service_role;
GRANT ALL ON driver_fixed_routes TO anon;
GRANT ALL ON driver_fixed_routes TO authenticated;
