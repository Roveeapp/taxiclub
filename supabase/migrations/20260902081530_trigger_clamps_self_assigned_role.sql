-- El trigger de alta copiaba a public.users.role lo que el cliente pusiera en
-- raw_user_meta_data->>'role'.
--
-- El alta real de la aplicación NO pasa por /api/auth/register —nada llama a
-- esa ruta—: la hace el navegador con
--   supabase.auth.signUp({ options: { data: { role: accountType } } })
-- desde pages/cuenta/login.vue. Así que endurecer el enum de esa ruta, como se
-- hizo en ec9774f, cerró una puerta que no se usaba mientras la que sí se usa
-- aceptaba 'admin'.
--
-- Comprobado insertando en auth.users la misma metadata que pone el navegador,
-- dentro de una transacción deshecha: public.users.role quedaba en 'admin'.
--
-- Autoasignarse rol solo vale para 'client' y 'driver' —el alta de taxista es
-- un flujo legítimo del producto y queda cerrada tras is_approved—. Cualquier
-- otro valor, 'admin' incluido, cae a 'client' y deja un WARNING. Un
-- administrador se crea cambiando public.users.role con la clave de servicio;
-- las dos únicas llamadas a createUser del servidor usan client o driver, así
-- que esto no rompe ningún flujo legítimo.
--
-- Esto es defensa en profundidad: la corrección de fondo va en
-- server/middleware/auth.ts, que leía el rol de la metadata teniendo la tabla
-- al lado. Hace falta porque el usuario puede cambiar su metadata DESPUÉS del
-- alta con supabase.auth.updateUser({ data: { role: 'admin' } }), que Supabase
-- permite sobre la cuenta propia por diseño, y entonces el trigger ya no
-- interviene.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rol_pedido text := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  rol_final  text;
BEGIN
  -- El rol lo pide el cliente, así que solo se admiten los autoasignables
  rol_final := CASE WHEN rol_pedido IN ('client', 'driver') THEN rol_pedido ELSE 'client' END;

  IF rol_final <> rol_pedido THEN
    RAISE WARNING 'Alta % pidió rol % y se le asigna client', NEW.id, rol_pedido;
  END IF;

  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    rol_final
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  -- Ficha de conductor. Antes ponía 'PENDING' en las dos columnas, y como
  -- license_number es UNIQUE eso solo funcionaba una vez en toda la vida de la
  -- base de datos. Ahora se queda a NULL si el alta no trae los datos.
  IF rol_final = 'driver' THEN
    INSERT INTO public.drivers (id, license_number, license_city)
    VALUES (
      NEW.id,
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'license_number', '')), ''),
      NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'license_city', '')), '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
