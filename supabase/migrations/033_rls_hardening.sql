-- ============================================================================
-- 033_rls_hardening.sql
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31
-- (registrada como version 20260831111338 / rls_hardening).
-- Verificado tras aplicarla: anon y authenticated reciben 42501 en lectura,
-- escritura y TRUNCATE; un cliente logueado sigue viendo sus 5 reservas y 0
-- de otro cliente; el advisory critico rls_disabled desaparecio.
--
-- Cierra dos agujeros críticos que dejaban toda la base de datos expuesta a
-- cualquiera con la clave anon (que es pública: viaja en el bundle del cliente).
--
-- 1) PERMISOS EXCESIVOS
--    005_fix_schema_and_grants.sql y 030_fix_missing_grants.sql hacen
--    `GRANT ALL ON ALL TABLES ... TO anon, authenticated`, y 030 además fija
--    DEFAULT PRIVILEGES para que toda tabla nueva herede ese acceso total.
--    La intención era arreglar service_role (así lo dicen sus comentarios),
--    pero se llevó por delante a los roles públicos.
--    Efecto: anon podía SELECT/INSERT/UPDATE/DELETE/TRUNCATE cualquier tabla.
--    Ojo: TRUNCATE **no** está sujeto a RLS, así que activar RLS no basta —
--    hay que revocar el permiso.
--
-- 2) RLS DESACTIVADO EN 13 TABLAS
--    002_rls_policies.sql nunca se aplicó a este proyecto (la tabla
--    supabase_migrations.schema_migrations está vacía: el schema se construyó
--    con SQL crudo). Las 13 tablas que 002 pretendía proteger siguen sin RLS.
--    Las 8 tablas creadas después sí lo tienen, gracias al event trigger
--    rls_auto_enable(), que solo actúa sobre tablas nuevas.
--
-- CRITERIO DE DISEÑO
--    El cliente (clave anon) accede directamente a la BD en un único sitio:
--      · app/pages/cuenta/reservas.vue → SELECT bookings + booking_assignments
--                                        + stations(name)
--      · app/composables/useBookingRealtime.ts → postgres_changes sobre
--                                        bookings y booking_assignments
--    Todo lo demás pasa por /api/* con service_role, que tiene rolbypassrls
--    (verificado), así que el RLS no le afecta.
--    Por tanto: RLS activado en todas las tablas y políticas SOLO para esos
--    tres casos. El resto queda en «RLS activo sin políticas» = denegar todo
--    a anon/authenticated, que es lo correcto porque nadie lo consume desde
--    el cliente.
--
--    Deliberadamente NO se replican las políticas de 002: `drivers_read_active
--    USING (is_active = TRUE)` y `vehicles_read_active` habrían expuesto
--    license_number y stripe_account_id a cualquier anónimo.
--
--    Las políticas envuelven auth.uid() en (select auth.uid()) para que se
--    evalúe una vez y no por fila.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Permisos: mínimo privilegio para anon y authenticated
-- ────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Que las tablas futuras no repitan el problema (anula lo que fijó 030)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- service_role conserva acceso total: es lo que usa useDb() en el backend
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- Lo único que el cliente necesita leer directamente
GRANT SELECT ON public.bookings            TO authenticated;
GRANT SELECT ON public.booking_assignments TO authenticated;
GRANT SELECT ON public.stations            TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Activar RLS en las 13 tablas que lo tenían apagado
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_stations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_prices        ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Políticas: solo los tres accesos reales del cliente
-- ────────────────────────────────────────────────────────────────────────────

-- bookings: cada cliente ve sus propias reservas.
-- Cubre tanto cuenta/reservas.vue como el postgres_changes de useBookingRealtime.
DROP POLICY IF EXISTS clients_own_bookings   ON public.bookings;
DROP POLICY IF EXISTS bookings_client_select ON public.bookings;
CREATE POLICY bookings_client_select ON public.bookings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = client_id);

-- booking_assignments: el cliente ve la asignación de SUS reservas
-- (matrícula y teléfono confirmados). Sustituye a clients_read_own_assignment,
-- que era correcta pero estaba inerte —RLS apagado— y llamaba a auth.uid()
-- por fila; y a drivers_own_assignments de 002, que filtraba por driver_id y
-- por tanto nunca habría dejado al cliente ver su propia asignación.
DROP POLICY IF EXISTS clients_read_own_assignment ON public.booking_assignments;
DROP POLICY IF EXISTS drivers_own_assignments     ON public.booking_assignments;
DROP POLICY IF EXISTS assignments_client_select   ON public.booking_assignments;
CREATE POLICY assignments_client_select ON public.booking_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_assignments.booking_id
        AND b.client_id = (SELECT auth.uid())
    )
  );

-- stations: datos de referencia (nombre y ubicación de las paradas).
-- Necesario para el join stations(name) de cuenta/reservas.vue.
DROP POLICY IF EXISTS stations_read          ON public.stations;
DROP POLICY IF EXISTS stations_public_select ON public.stations;
CREATE POLICY stations_public_select ON public.stations
  FOR SELECT TO anon, authenticated
  USING (TRUE);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Índice que necesitan la política y el filtro de realtime
-- ────────────────────────────────────────────────────────────────────────────

-- booking_assignments.booking_id no tenía índice, pese a ser FK, columna de
-- la política de arriba y filtro del canal realtime (booking_id=eq.X).
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking
  ON public.booking_assignments (booking_id);

COMMIT;

-- ============================================================================
-- ROLLBACK (solo si algo se rompe; devuelve la BD al estado anterior)
-- ============================================================================
-- BEGIN;
--   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;  -- (usar DISABLE)
--   -- DISABLE en las 13 tablas del punto 2:
--   --   users, drivers, vehicles, stations, driver_stations,
--   --   driver_availability, bookings, booking_assignments, return_offers,
--   --   memberships, driver_payouts, system_config, route_prices
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
-- COMMIT;
-- ============================================================================
