-- ============================================================================
-- search_path fijado en las 29 funciones plpgsql que lo tenían mutable
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- Son todas SECURITY INVOKER, así que el riesgo es mucho menor que en una
-- SECURITY DEFINER —corren con los privilegios de quien llama, no del dueño—,
-- pero un search_path mutable sigue permitiendo que una referencia sin
-- cualificar apunte a un objeto que no es el esperado. Y cierra los 29 avisos
-- de function_search_path_mutable del advisor.
--
-- Se fija a `public` y no a '' porque sus cuerpos usan nombres sin cualificar
-- (`FROM drivers`, `FROM bookings`): vaciarlo las rompería todas.
--
-- Se recorre el catálogo en lugar de listarlas a mano: así no se queda ninguna
-- fuera por una errata, y la migración es idempotente. Verificado después: 0
-- funciones sin search_path.
-- ============================================================================

DO $$
DECLARE
  fn RECORD;
  n  INTEGER := 0;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.proconfig IS NULL
      AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', fn.proname, fn.args);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'search_path fijado en % funciones', n;
END $$;
