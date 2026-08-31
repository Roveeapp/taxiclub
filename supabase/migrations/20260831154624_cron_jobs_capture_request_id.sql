-- ============================================================================
-- Las tareas capturan el request_id de su llamada HTTP
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- Sin esto no hay forma de saber si una tarea funcionó: cron.job_run_details
-- dice «succeeded» aunque la respuesta sea 404, y net._http_response no guarda
-- ni la URL ni el cuerpo, así que no se puede saber a qué tarea pertenece cada
-- respuesta. Ver 20260831145000 para el detalle.
--
-- Se conserva la lectura de la clave desde Vault (ver 20260831122637).
--
-- Al final se vuelven a pausar las dos tareas de dinero: cron.schedule()
-- REACTIVA el job que reprograma, y el MVP sale sin pagos (ver 20260831133000).
-- ============================================================================

SELECT cron.schedule(
  'expire-offers',
  '*/5 * * * *',
  $cmd$
  INSERT INTO public.cron_task_runs (jobname, request_id)
  SELECT 'expire-offers', net.http_post(
      url := 'https://hgnsvqhizbdwawkgjciw.supabase.co/functions/v1/scheduled-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"task": "expire-offers"}'::jsonb
  );
  $cmd$
);

SELECT cron.schedule(
  'remind-unconfirmed',
  '*/15 * * * *',
  $cmd$
  INSERT INTO public.cron_task_runs (jobname, request_id)
  SELECT 'remind-unconfirmed', net.http_post(
      url := 'https://hgnsvqhizbdwawkgjciw.supabase.co/functions/v1/scheduled-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"task": "remind-unconfirmed"}'::jsonb
  );
  $cmd$
);

SELECT cron.schedule(
  'process-payouts',
  '0 8 1 * *',
  $cmd$
  INSERT INTO public.cron_task_runs (jobname, request_id)
  SELECT 'process-payouts', net.http_post(
      url := 'https://hgnsvqhizbdwawkgjciw.supabase.co/functions/v1/scheduled-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"task": "process-payouts"}'::jsonb
  );
  $cmd$
);

SELECT cron.schedule(
  'charge-memberships',
  '0 9 1 * *',
  $cmd$
  INSERT INTO public.cron_task_runs (jobname, request_id)
  SELECT 'charge-memberships', net.http_post(
      url := 'https://hgnsvqhizbdwawkgjciw.supabase.co/functions/v1/scheduled-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"task": "charge-memberships"}'::jsonb
  );
  $cmd$
);

SELECT cron.alter_job(jobid, active := false)
FROM cron.job
WHERE jobname IN ('process-payouts', 'charge-memberships');
