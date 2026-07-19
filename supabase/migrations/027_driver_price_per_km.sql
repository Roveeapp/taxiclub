-- ============================================================
-- 027 — Tarifa por kilómetro propia de cada conductor
-- ============================================================
-- Cada miembro puede fijar su €/km desde su panel; prevalece
-- sobre la tarifa global (price_per_km de system_config).
-- El presupuesto al cliente se calcula con la tarifa del
-- conductor que recibirá la reserva (peek de asignación).
-- ============================================================

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS custom_price_per_km NUMERIC(6,2)
    CHECK (custom_price_per_km IS NULL OR (custom_price_per_km > 0 AND custom_price_per_km <= 100));

COMMENT ON COLUMN drivers.custom_price_per_km IS 'Tarifa €/km del conductor. NULL = usar price_per_km global.';
