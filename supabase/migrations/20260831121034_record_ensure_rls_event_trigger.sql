-- ============================================================================
-- Registra el event trigger `ensure_rls`, que YA existe en la BD pero no
-- estaba en ninguna migración.
--
-- POR QUÉ FALTABA
--   Los event triggers son de ámbito de clúster, no de esquema, así que
--   `pg_dump --schema=public` no los incluye y la baseline (20260831000000) se
--   quedó sin él. La función rls_auto_enable() sí está en la baseline; lo que
--   faltaba era el trigger que la engancha.
--
-- QUÉ HACE
--   Activa RLS automáticamente en cada tabla nueva del esquema public. Es la
--   red de seguridad que evita repetir el agujero original, en el que 13 tablas
--   se quedaron sin RLS y expuestas a la clave anon durante meses. De hecho es
--   la razón por la que las 8 tablas más recientes sí tenían RLS: se crearon
--   cuando este trigger ya existía.
--
--   Sin este registro, una reconstrucción del proyecto desde cero se quedaría
--   sin esa protección, que es justo el tipo de fallo silencioso más caro de
--   detectar: nada se rompe, simplemente las tablas nuevas nacen sin RLS.
--
-- IDEMPOTENTE A PROPÓSITO
--   En la BD actual el trigger existe, así que esto no hace nada (verificado:
--   siguió intacto tras aplicarla). Se evita el patrón DROP + CREATE porque
--   crear event triggers requiere privilegios elevados; si el CREATE fallara
--   tras el DROP, la BD se quedaría sin la red de seguridad.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'ensure_rls') THEN
    EXECUTE $ddl$
      CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
        EXECUTE FUNCTION public.rls_auto_enable()
    $ddl$;
    RAISE NOTICE 'ensure_rls creado';
  ELSE
    RAISE NOTICE 'ensure_rls ya existía, no se toca';
  END IF;
END $$;
