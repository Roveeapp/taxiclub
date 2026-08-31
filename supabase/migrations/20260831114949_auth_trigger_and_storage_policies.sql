-- ============================================================================
-- Objetos que la baseline (20260831000000) no capturó.
--
-- `supabase db dump --schema=public` deja fuera lo que vive en otros esquemas.
-- Un `supabase db pull` posterior reveló estos tres objetos, que sí existen en
-- la BD y son necesarios para que el proyecto funcione. Se recogen aquí para
-- que una reconstrucción desde cero sea fiel.
--
-- Escrito de forma idempotente: estos objetos YA existen en la BD, esta
-- migración es el registro de ese estado.
--
-- NOTA: el pull original incluía además un `drop extension pg_net` seguido de
-- su recreación. Es ruido del motor de diff (la extensión está instalada en
-- public), y se ha eliminado a propósito: ejecutarlo tumbaría las llamadas
-- HTTP que hace pg_cron.
-- ============================================================================

BEGIN;

-- 1. Crea la fila de public.users (y la ficha de driver si toca) al registrarse.
--    Sin este trigger, un alta en Supabase Auth no crea el perfil.
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Políticas del bucket driver-docs (documentación de los taxistas).
--    Ojo: driver_docs_admin invoca public.is_admin(), así que ese rol necesita
--    EXECUTE sobre la función o CUALQUIER select sobre storage.objects falla
--    con 42501 — no devuelve cero filas, da error. Ver 20260831115227.
DROP POLICY IF EXISTS "driver_docs_admin" ON storage.objects;
CREATE POLICY "driver_docs_admin" ON storage.objects
  AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'driver-docs' AND public.is_admin());

DROP POLICY IF EXISTS "driver_docs_own" ON storage.objects;
CREATE POLICY "driver_docs_own" ON storage.objects
  AS PERMISSIVE FOR ALL TO public
  USING (bucket_id = 'driver-docs'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

COMMIT;
