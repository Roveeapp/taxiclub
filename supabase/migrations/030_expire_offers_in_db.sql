-- ============================================================
-- 030 — Caducidad de ofertas garantizada
-- ============================================================
-- Cuando pasa la hora "hasta" de una oferta activa, se marca como
-- 'expired'. El cron de la migración 014 dependía de una edge
-- function con URL placeholder (nunca llegó a ejecutarse); ahora
-- la expiración corre 100% dentro de Postgres cada minuto, sin
-- depender de nada externo. Además la API expira "al vuelo" al
-- consultar ofertas, por si el cron no estuviera disponible.
-- ============================================================

-- Función de expiración (invocable también manualmente)
CREATE OR REPLACE FUNCTION expire_stale_offers()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE return_offers
  SET status = 'expired'
  WHERE status = 'active'
    AND available_until < NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_stale_offers() TO service_role;

-- Cron en la propia base de datos (si pg_cron está disponible)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Reemplaza el job antiguo basado en la edge function
    BEGIN
      PERFORM cron.unschedule('expire-offers');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- no existía
    END;
    PERFORM cron.schedule('expire-offers', '* * * * *', 'SELECT expire_stale_offers()');
  ELSE
    RAISE NOTICE 'pg_cron no disponible: la expiración se hará al vuelo desde la API';
  END IF;
END $$;
