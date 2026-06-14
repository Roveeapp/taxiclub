-- Habilitamos las extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- IMPORTANTE: Cambia la URL base y el Authorization Header con el de tu proyecto Supabase.
-- URL base: https://<TU-PROJECT-REF>.supabase.co/functions/v1/scheduled-tasks
-- Authorization: Bearer <TU-SERVICE-ROLE-KEY>

-- Limpiamos jobs previos si existen
SELECT cron.unschedule('expire-offers');
SELECT cron.unschedule('remind-unconfirmed');
SELECT cron.unschedule('process-payouts');
SELECT cron.unschedule('charge-memberships');


  -- Expira ofertas cada 5 minutos
  SELECT cron.schedule(
    'expire-offers',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url:='https://TU_PROYECTO.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"task": "expire-offers"}'::jsonb
    )
    $$
  );

  -- Recuerda viajes sin confirmar cada 15 minutos
  SELECT cron.schedule(
    'remind-unconfirmed',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url:='https://TU_PROYECTO.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"task": "remind-unconfirmed"}'::jsonb
    )
    $$
  );

  -- Procesa pagos (liquidaciones) a taxistas a las 08:00 AM el día 1 de cada mes
  SELECT cron.schedule(
    'process-payouts',
    '0 8 1 * *',
    $$
    SELECT net.http_post(
        url:='https://TU_PROYECTO.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"task": "process-payouts"}'::jsonb
    )
    $$
  );

  -- Cobra la cuota de pertenencia a las 09:00 AM el día 1 de cada mes
  SELECT cron.schedule(
    'charge-memberships',
    '0 9 1 * *',
    $$
    SELECT net.http_post(
        url:='https://TU_PROYECTO.supabase.co/functions/v1/scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"task": "charge-memberships"}'::jsonb
    )
    $$
  );
*/
