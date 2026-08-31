-- ============================================================================
-- Pausa las tareas de dinero mientras los pagos están desactivados
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- process-payouts y charge-memberships no pueden hacer su trabajo sin pagos, y
-- además hoy son stubs: cuentan registros, no llaman a Stripe y devuelven
-- `success: true`. Dejarlos activos genera un rastro de ejecuciones correctas de
-- un trabajo que nunca se hizo — exactamente cómo pasó desapercibido que las
-- cuatro tareas llevaban meses devolviendo 404.
--
-- expire-offers y remind-unconfirmed siguen activas: no dependen de los pagos y
-- sí están implementadas.
-- ============================================================================

SELECT cron.alter_job(jobid, active := false)
FROM cron.job
WHERE jobname IN ('process-payouts', 'charge-memberships');
