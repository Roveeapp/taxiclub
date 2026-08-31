-- ============================================================================
-- Liquidación mensual en los dos sentidos
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- El negocio funciona en dos direcciones según quién cobre al cliente:
--
--   · platform_pays_driver — la plataforma cobra al cliente y transfiere al
--     taxista el bruto menos comisión y cuota. Es el modelo futuro.
--   · driver_pays_platform — el taxista cobra en mano y debe al club la
--     comisión más la cuota. Es el modelo del MVP.
--
-- La tabla solo sabía expresar el primero: `final_payout` significa «lo que se
-- transfiere al taxista», y las dos pantallas lo mostraban en verde como dinero
-- a su favor. Con el modelo del MVP eso le enseña al taxista 385 € a cobrar
-- cuando en realidad debe 65 € — una factura equivocada, y en el sentido que
-- más fricción genera.
--
-- Se añaden columnas en lugar de reinterpretar `final_payout`, para que el
-- sentido sea explícito en el dato y no dependa de saber en qué modelo se
-- generó la fila. La tabla estaba vacía, así que no hubo nada que migrar.
--
-- `direction` sale del SIGNO del saldo, no de la bandera de pagos, y eso cubre
-- un caso límite real: con pagos activos, un socio con pocos viajes puede tener
-- una cuota mayor que su neto, y entonces es él quien debe. Con 10 € de bruto,
-- 1 € de comisión y 20 € de cuota, debe 11 €.
-- ============================================================================

ALTER TABLE public.driver_payouts
  ADD COLUMN IF NOT EXISTS direction text
    CHECK (direction IN ('platform_pays_driver', 'driver_pays_platform')),
  ADD COLUMN IF NOT EXISTS amount_due numeric(10, 2)
    CHECK (amount_due >= 0),
  ADD COLUMN IF NOT EXISTS trip_count integer;

COMMENT ON COLUMN public.driver_payouts.direction IS
  'Sentido del saldo: platform_pays_driver (la plataforma transfiere) o driver_pays_platform (el taxista debe la comisión y la cuota).';
COMMENT ON COLUMN public.driver_payouts.amount_due IS
  'Importe a liquidar, siempre positivo, en el sentido que indica direction.';

-- El período de cada conductor es único: evita liquidar dos veces el mismo mes
CREATE UNIQUE INDEX IF NOT EXISTS driver_payouts_driver_period_unique
  ON public.driver_payouts (driver_id, period_start);
