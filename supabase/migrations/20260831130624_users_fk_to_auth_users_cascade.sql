-- ============================================================================
-- public.users → auth.users con ON DELETE CASCADE
--
-- EL PROBLEMA
--   public.users no tenía NINGUNA clave ajena hacia auth.users, así que borrar
--   una cuenta de Supabase Auth dejaba su fila atrás con el correo, el teléfono
--   y el nombre. Se detectó al eliminar un usuario de prueba: auth.users quedó
--   en 3 filas y public.users en 4.
--
--   La ruta de baja del panel (admin/conductores/[id].delete.ts) ya borraba
--   public.users explícitamente, pero cualquier otra vía —el panel de Supabase,
--   un script, la API de administración— dejaba los datos personales huérfanos.
--   Para el derecho de supresión del RGPD eso significa que borrar no borra.
--
-- POR QUÉ ES SEGURO
--   Comprobado antes de aplicar:
--     · 0 filas huérfanas que bloquearan la validación de la restricción.
--     · Los tres sitios que insertan en public.users
--       (auth/register.post.ts, admin/conductores/index.post.ts y
--       scripts/create-test-admin.mjs) llaman primero a
--       auth.admin.createUser() y usan el id devuelto, así que la fila
--       referenciada existe siempre. handle_new_user() es un trigger AFTER
--       INSERT sobre auth.users, con lo que tampoco puede adelantarse.
--     · El rol postgres tiene privilegio REFERENCES sobre auth.users.
--
-- VERIFICADO DESPUÉS (en una transacción con rollback)
--   Al crear un usuario en auth.users, el trigger crea su perfil y su ficha de
--   driver. Al borrar SOLO de auth.users, ambas desaparecen en cascada: la de
--   users por esta restricción, y la de drivers por la cascada que ya existía
--   de drivers a users.
-- ============================================================================

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
