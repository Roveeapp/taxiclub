-- ============================================================================
-- Vigilancia de las tareas programadas
--
-- APLICADAS a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- EL PROBLEMA
--   cron.job_run_details marca `succeeded` mientras el SQL se ejecute, aunque
--   la llamada HTTP devuelva 404 o 401. Las cuatro tareas de este proyecto
--   llevaban MESES fallando con el historial de cron en verde. El 404 solo
--   aparecía en net._http_response, que nadie mira.
--
-- POR QUÉ NO BASTA CON CRUZAR LAS DOS TABLAS
--   net._http_response guarda un `id` de petición pero ni la URL ni el cuerpo,
--   y cron.job_run_details.return_message es solo «1 row». No hay nada por lo
--   que unirlas.
--
--   Un cruce por proximidad temporal sería ambiguo: las tareas */5 y */15
--   coinciden a las :00, :15, :30 y :45 —cuatro veces por hora— y atribuiría la
--   respuesta a la tarea equivocada. Así que cada tarea captura el request_id
--   que devuelve net.http_post en public.cron_task_runs, y la unión pasa a ser
--   exacta.
--
-- QUÉ QUEDA DISPONIBLE
--   · cron_task_health — cada ejecución con su respuesta HTTP y su desenlace
--   · cron_task_status — una fila por tarea, con la última y los fallos de 24 h
--   · GET /api/admin/tareas — lo mismo, con una bandera hayProblemas
--
--   Desenlaces: ok | error | timeout | sin_respuesta | pendiente. «pendiente»
--   existe para no dar por fallida una tarea que acaba de encolarse y cuya
--   respuesta aún no ha llegado.
--
--   Verificado con los seis casos en una transacción con rollback: 200 → ok,
--   401/404/500 → error, timed_out → timeout, sin respuesta y antigua →
--   sin_respuesta, recién encolada → pendiente.
--
-- OJO al editar una tarea: cron.schedule() REACTIVA el job que reprograma, así
-- que hay que volver a pausar las de dinero si los pagos siguen desactivados.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_task_runs (
  id         bigserial PRIMARY KEY,
  jobname    text NOT NULL,
  request_id bigint,
  queued_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cron_task_runs IS
  'Enlaza cada ejecución de una tarea programada con el id de su petición HTTP, para poder saber si de verdad funcionó.';

CREATE INDEX IF NOT EXISTS idx_cron_task_runs_jobname ON public.cron_task_runs (jobname, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_task_runs_request ON public.cron_task_runs (request_id);

ALTER TABLE public.cron_task_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_task_runs FROM anon, authenticated;
GRANT ALL ON public.cron_task_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.cron_task_runs_id_seq TO service_role;

CREATE OR REPLACE VIEW public.cron_task_health AS
SELECT
  r.id,
  r.jobname,
  r.queued_at,
  r.request_id,
  resp.status_code,
  resp.error_msg,
  resp.timed_out,
  left(resp.content, 300) AS response_excerpt,
  CASE
    WHEN resp.id IS NULL AND r.queued_at > now() - interval '2 minutes' THEN 'pendiente'
    WHEN resp.id IS NULL THEN 'sin_respuesta'
    WHEN resp.timed_out THEN 'timeout'
    WHEN resp.status_code BETWEEN 200 AND 299 THEN 'ok'
    ELSE 'error'
  END AS outcome
FROM public.cron_task_runs r
LEFT JOIN net._http_response resp ON resp.id = r.request_id;

COMMENT ON VIEW public.cron_task_health IS
  'Resultado REAL de cada tarea programada. cron.job_run_details solo dice si el SQL corrió; el desenlace de la llamada está aquí.';

REVOKE ALL ON public.cron_task_health FROM anon, authenticated;
GRANT SELECT ON public.cron_task_health TO service_role;

CREATE OR REPLACE VIEW public.cron_task_status AS
SELECT DISTINCT ON (h.jobname)
  h.jobname,
  j.schedule,
  j.active,
  h.queued_at   AS last_run_at,
  h.status_code AS last_status_code,
  h.outcome     AS last_outcome,
  h.response_excerpt,
  (SELECT count(*) FROM public.cron_task_health f
     WHERE f.jobname = h.jobname
       AND f.outcome IN ('error', 'timeout', 'sin_respuesta')
       AND f.queued_at > now() - interval '24 hours') AS fallos_ultimas_24h
FROM public.cron_task_health h
LEFT JOIN cron.job j ON j.jobname = h.jobname
WHERE h.outcome <> 'pendiente'
ORDER BY h.jobname, h.queued_at DESC;

COMMENT ON VIEW public.cron_task_status IS
  'Una fila por tarea con el desenlace de su última ejecución y los fallos de las últimas 24 h.';

REVOKE ALL ON public.cron_task_status FROM anon, authenticated;
GRANT SELECT ON public.cron_task_status TO service_role;
