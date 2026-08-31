-- ============================================================================
-- 034_harden_security_definer_functions.sql
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31
-- (registrada como version 20260831112337 / harden_security_definer_functions).
--
-- Cierra los avisos anon_security_definer_function_executable y
-- function_search_path_mutable sobre las 5 funciones SECURITY DEFINER, que
-- eran invocables por cualquier anónimo vía /rest/v1/rpc/*.
--
-- Por qué revocar no rompe nada:
--   · handle_new_user()          → trigger on_auth_user_created (auth.users)
--   · sync_booking_on_confirm()  → trigger trg_sync_booking_on_confirm
--   · rls_auto_enable()          → event trigger ensure_rls
--     Postgres NO comprueba el privilegio EXECUTE al disparar un trigger, solo
--     al crearlo. Verificado en la práctica: un INSERT en auth.users siguió
--     funcionando después de revocar.
--   · is_admin() y get_user_role() solo leen el JWT del propio llamante.
--     Ninguna política RLS ni ninguna línea del código las invoca (comprobado).
--
-- Se revoca también a PUBLIC porque es de ahí de donde anon y authenticated
-- heredan el EXECUTE por defecto en Postgres; revocar solo a esos dos roles
-- no habría cerrado nada.
-- ============================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_booking_on_confirm() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role()           FROM PUBLIC, anon, authenticated;

-- search_path mutable en una función SECURITY DEFINER es un vector real de
-- escalada: puede redirigir una referencia no cualificada a un objeto del
-- atacante. is_admin() y get_user_role() solo invocan auth.jwt(), que ya va
-- cualificado, así que vaciarlo es seguro. Las otras tres ya lo tenían fijado
-- ('public' las dos de trigger, 'pg_catalog' el event trigger).
ALTER FUNCTION public.is_admin()      SET search_path = '';
ALTER FUNCTION public.get_user_role() SET search_path = '';

COMMIT;
