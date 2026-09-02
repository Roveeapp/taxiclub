-- LA PANTALLA DE LIQUIDACIONES DEL ADMIN DEVOLVÍA 500, Y LO ROMPÍ YO
--
-- get_admin_payouts() declara un RETURNS TABLE con una lista fija de columnas y
-- dentro hacía `SELECT dp.*`:
--
--   RETURNS TABLE(id uuid, driver_id uuid, ... 13 columnas de driver_payouts)
--   SELECT dp.*, u.full_name, u.email FROM driver_payouts dp ...
--
-- Al implementar la liquidación en los dos sentidos (8d1b414) añadí seis
-- columnas a driver_payouts: direction, amount_due, trip_count, settled_amount,
-- settlement_status y due_date. El `dp.*` empezó a devolver 19 columnas contra
-- 13 declaradas, y Postgres aborta con «structure of query does not match
-- function result type».
--
-- Consecuencia: GET /api/admin/liquidaciones devolvía 500 y la pantalla de
-- liquidaciones del admin no cargaba. Es el único canal de ingresos del MVP —el
-- club cobra ahí su comisión— y la auditoría daba ese bloque por resuelto.
--
-- Por qué mi verificación no lo vio: probé el CÁLCULO con tests unitarios y la
-- ruta de PROCESAR liquidaciones, pero nunca llamé a la de LEERLAS. Un `alias.*`
-- dentro de una función con RETURNS TABLE explícito es una mina que solo
-- estalla cuando alguien toca la tabla, y estalla en el camino de lectura.
-- Apareció al abrir el panel en un navegador para revisar el tema claro.
--
-- Se enumeran las columnas, que es lo que impide que vuelva a pasar, y se
-- incluyen las seis nuevas: las dos pantallas de liquidaciones leen `direction`
-- y `amount_due`, así que hasta ahora les llegaban indefinidas incluso cuando la
-- función respondía.
--
-- Comprobado que ninguna otra función del esquema tiene este patrón, y
-- verificado con una fila real en una transacción deshecha: las 21 columnas
-- llegan, incluidas direction=driver_pays_platform y amount_due=140,00.
--
-- Hay que borrarla antes: cambiar el tipo de retorno de una función existente
-- no se puede hacer con CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.get_admin_payouts();

CREATE OR REPLACE FUNCTION public.get_admin_payouts()
 RETURNS TABLE(id uuid, driver_id uuid, period_start date, period_end date, gross_amount numeric, commission_pct numeric, commission_amt numeric, net_amount numeric, membership_fee numeric, final_payout numeric, stripe_payout_id text, paid_at timestamp with time zone, created_at timestamp with time zone, direction text, amount_due numeric, trip_count integer, settled_amount numeric, settlement_status text, due_date date, driver_name text, driver_email text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.driver_id,
    dp.period_start,
    dp.period_end,
    dp.gross_amount,
    dp.commission_pct,
    dp.commission_amt,
    dp.net_amount,
    dp.membership_fee,
    dp.final_payout,
    dp.stripe_payout_id,
    dp.paid_at,
    dp.created_at,
    dp.direction,
    dp.amount_due,
    dp.trip_count,
    dp.settled_amount,
    dp.settlement_status,
    dp.due_date,
    u.full_name AS driver_name,
    u.email AS driver_email
  FROM driver_payouts dp
  JOIN drivers d ON d.id = dp.driver_id
  JOIN users u ON u.id = dp.driver_id
  ORDER BY dp.created_at DESC;
END;
$function$;
