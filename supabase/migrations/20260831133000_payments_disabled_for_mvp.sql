-- ============================================================================
-- MVP sin pagos por plataforma
--
-- APLICADAS a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- Modelo del MVP: el cliente paga al taxista en el taxi, como siempre. El club
-- le cobra al taxista la comisión de los viajes a fin de mes. No hay cobro al
-- cliente a través de la plataforma.
--
-- 1) BANDERA payments_enabled
--    Hasta ahora «sin pagos» era un estado implícito, deducido de que faltara
--    la clave de Stripe. Dos consecuencias malas:
--      · Indistinguible de una avería. La pantalla de pago decía «la pasarela
--        no está disponible ahora mismo» y justo debajo prometía que «Stripe
--        pre-autorizará el pago».
--      · Un despliegue que por descuido tuviera clave activaría los cobros sin
--        que nadie lo hubiera decidido.
--    arePaymentsEnabled() exige la bandera Y la clave, y por ahí pasan todas
--    las rutas que tocan Stripe.
--
-- 2) CRON DE DINERO EN PAUSA
--    process-payouts y charge-memberships quedan inactivos. Además de depender
--    de los pagos, hoy son stubs: cuentan registros, no llaman a Stripe y
--    devuelven `success: true`. Dejarlos activos genera un rastro de
--    ejecuciones correctas de un trabajo que nunca se hizo — exactamente cómo
--    pasó desapercibido que las cuatro tareas llevaban meses devolviendo 404.
--    expire-offers y remind-unconfirmed siguen activas: no dependen de los
--    pagos y sí están implementadas.
--
-- Para activar los pagos más adelante:
--   UPDATE public.system_config SET value = 'true' WHERE key = 'payments_enabled';
--   SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='process-payouts'),    active := true);
--   SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='charge-memberships'), active := true);
-- ============================================================================

INSERT INTO public.system_config (key, value)
VALUES ('payments_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

SELECT cron.alter_job(jobid, active := false)
FROM cron.job
WHERE jobname IN ('process-payouts', 'charge-memberships');
