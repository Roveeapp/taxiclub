-- 006_auth_and_booking_triggers.sql
-- Triggers de soporte que la app necesita:
--  · handle_new_user: al crear un usuario en auth.users, crea su fila en public.users
--    (lo usa el registro del lado cliente vía supabase.auth.signUp). Es idempotente
--    con el endpoint server /api/auth/register gracias a ON CONFLICT DO NOTHING.
--  · sync_booking_on_confirm: red de seguridad que marca la reserva como 'confirmed'
--    cuando el conductor establece confirmed_at en su asignación.

-- ─────────────────────────────────────────────────────────────
-- 1. Sincronización auth.users → public.users
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Si se registra como conductor, crear su ficha de driver con datos pendientes
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'driver' THEN
    INSERT INTO public.drivers (id, license_number, license_city)
    VALUES (NEW.id, 'PENDING', 'PENDING')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. Confirmación de reserva → estado 'confirmed'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_booking_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo cuando confirmed_at pasa de NULL a un valor
  IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN
    UPDATE public.bookings
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = NEW.booking_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_on_confirm ON public.booking_assignments;
CREATE TRIGGER trg_sync_booking_on_confirm
  AFTER UPDATE ON public.booking_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_on_confirm();
