-- ============================================================================
-- Libro de cobros de las liquidaciones
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- El club cobra al taxista por transferencia o por Stripe, y hace falta
-- historial, registro y resguardos. Eso pide un libro de asientos, no un campo
-- de estado en driver_payouts: un cobro puede llegar en dos plazos, puede
-- corregirse, y siempre debe quedar constancia de quién lo registró y cuándo.
--
-- Cada fila de payout_settlements es un movimiento. El importe puede ser
-- negativo, así que una devolución o una corrección se registra con un asiento
-- nuevo en lugar de borrando historial — que es lo que permite auditar después.
--
-- El estado de la liquidación NO se escribe a mano: lo recalcula un trigger
-- desde la suma de asientos, así que no puede desincronizarse del historial.
-- Verificado en el ciclo completo: pending → partial (40 €) → settled (65 €) →
-- de vuelta a partial tras una devolución de 25 €, conservando los 3 asientos.
--
-- El margen de un céntimo en el trigger evita que los redondeos dejen una
-- liquidación eternamente «parcial» por 0,01 €.
--
-- Los resguardos van a un bucket PRIVADO. Un justificante de transferencia
-- lleva datos de cuenta, y una URL pública sería permanente y adivinable: la
-- descarga se sirve con URLs firmadas de 10 minutos generadas en servidor.
-- La ruta `<driver_id>/<payout_id>/<cobro_id>.<ext>` agrupa por conductor y por
-- liquidación, así que localizar los justificantes de un taxista o de un mes es
-- inmediato sin consultar la base de datos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payout_settlements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id    uuid NOT NULL REFERENCES public.driver_payouts(id) ON DELETE CASCADE,
  amount       numeric(10, 2) NOT NULL CHECK (amount <> 0),
  method       text NOT NULL CHECK (method IN ('transfer', 'stripe', 'cash', 'adjustment')),
  reference    text,
  receipt_path text,
  notes        text,
  settled_at   timestamptz NOT NULL DEFAULT now(),
  -- Sin ON DELETE CASCADE: el rastro sobrevive a la baja de quien lo anotó
  recorded_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payout_settlements IS
  'Movimientos de cobro de cada liquidación. El estado de driver_payouts se deriva de la suma de estas filas.';

CREATE INDEX IF NOT EXISTS idx_payout_settlements_payout ON public.payout_settlements (payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_settlements_settled ON public.payout_settlements (settled_at DESC);

ALTER TABLE public.driver_payouts
  ADD COLUMN IF NOT EXISTS settled_amount numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'pending'
    CHECK (settlement_status IN ('pending', 'partial', 'settled')),
  ADD COLUMN IF NOT EXISTS due_date date;

COMMENT ON COLUMN public.driver_payouts.settled_amount IS
  'Suma de payout_settlements. La mantiene un trigger; no escribir a mano.';
COMMENT ON COLUMN public.driver_payouts.settlement_status IS
  'pending | partial | settled. Derivado de settled_amount frente a amount_due.';

CREATE OR REPLACE FUNCTION public.sync_payout_settlement_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payout_id uuid := COALESCE(NEW.payout_id, OLD.payout_id);
  v_total     numeric(10, 2);
  v_due       numeric(10, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.payout_settlements WHERE payout_id = v_payout_id;

  SELECT COALESCE(amount_due, 0) INTO v_due
  FROM public.driver_payouts WHERE id = v_payout_id;

  UPDATE public.driver_payouts
  SET settled_amount = v_total,
      settlement_status = CASE
        WHEN v_due <= 0 THEN 'settled'
        WHEN v_total >= v_due - 0.01 THEN 'settled'
        WHEN v_total > 0 THEN 'partial'
        ELSE 'pending'
      END,
      paid_at = CASE WHEN v_total >= v_due - 0.01 AND v_due > 0 THEN now() ELSE NULL END
  WHERE id = v_payout_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payout_settlement ON public.payout_settlements;
CREATE TRIGGER trg_sync_payout_settlement
  AFTER INSERT OR UPDATE OR DELETE ON public.payout_settlements
  FOR EACH ROW EXECUTE FUNCTION public.sync_payout_settlement_status();

ALTER TABLE public.payout_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_settlements FROM anon, authenticated;
GRANT ALL ON public.payout_settlements TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payout-receipts', 'payout-receipts', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
