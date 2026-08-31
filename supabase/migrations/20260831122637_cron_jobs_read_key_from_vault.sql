-- ============================================================================
-- Los 4 cron jobs leen la service_role key de Supabase Vault en lugar de
-- tenerla hardcodeada en el texto de su comando.
--
-- EL PROBLEMA
--   Los comandos llevaban el JWT incrustado en la cabecera
--   `Authorization: Bearer <jwt>`. Verificado decodificándolo: role=service_role,
--   219 caracteres, la misma clave del .env. Dos consecuencias:
--
--     · Trampa de rotación. Rotar la service_role key rompía los 4 jobs EN
--       SILENCIO: los cron seguirían disparándose y la Edge Function devolvería
--       401, sin que nada avisara. Se perderían la expiración de ofertas, los
--       recordatorios, las liquidaciones mensuales y el cobro de cuotas.
--     · Impedía versionarlos. Cualquier migración con esos comandos habría
--       filtrado la clave al repositorio.
--
-- LA SOLUCIÓN
--   La clave vive en vault.secrets con el nombre 'service_role_key' y los jobs
--   la resuelven en cada ejecución. Rotarla pasa a ser un solo UPDATE, sin
--   tocar los jobs:
--
--     SELECT vault.update_secret(
--       (SELECT id FROM vault.secrets WHERE name = 'service_role_key'),
--       '<nueva-clave>'
--     );
--
--   El secreto se creó extrayéndolo del propio comando del cron con SQL, para
--   que el valor en claro no pasara por ningún fichero. Comprobado: 219
--   caracteres, role=service_role, MD5 idéntico al que usaban los jobs.
--
-- VERIFICACIÓN PREVIA
--   Antes de aplicar se comparó la cabecera jsonb que construye esta expresión
--   con la que los jobs enviaban hardcodeada: `identico = true` (comparación
--   jsonb =, 226 caracteres de Authorization). La petición HTTP no cambia.
--
--   cron.schedule() con un jobname existente reemplaza el job conservando su
--   jobid. Verificado después: los 4 mantienen jobid 1-4, horario y active=true,
--   ninguno contiene ya el JWT, y las ejecuciones siguen en 'succeeded'.
--
-- OJO — PROBLEMA APARTE, NO RESUELTO AQUÍ
--   Estos jobs devuelven 404 desde antes de este cambio: no hay NINGUNA Edge
--   Function desplegada en el proyecto (`supabase functions list` devuelve
--   vacío), aunque supabase/functions/ contiene scheduled-tasks y
--   stripe-webhook. Es decir, las 4 tareas programadas no se ejecutan en
--   realidad. Este cambio no lo arregla ni lo empeora: el 404 es idéntico antes
--   y después. Requiere `supabase functions deploy`.
-- ============================================================================

SELECT cron.schedule(
  'expire-offers',
  '*/5 * * * *',
  $cmd$
  SELECT net.http_post(
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
  SELECT net.http_post(
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
  SELECT net.http_post(
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
  SELECT net.http_post(
      url := 'https://hgnsvqhizbdwawkgjciw.supabase.co/functions/v1/scheduled-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{"task": "charge-memberships"}'::jsonb
  );
  $cmd$
);
