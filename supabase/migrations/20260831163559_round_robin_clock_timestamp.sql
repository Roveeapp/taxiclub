-- ============================================================================
-- El turno se marca con clock_timestamp(), no con now()
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- `now()` es constante dentro de una transacción, así que varias asignaciones
-- seguidas en el mismo bloque quedaban con la marca idéntica y el reparto
-- empataba: se observó al probar seis repartos consecutivos, donde el cuarto
-- repetía conductor. clock_timestamp() avanza, con lo que el turno progresa.
--
-- En producción cada reserva es su propia transacción y no se notaría, pero
-- cualquier operación por lotes —reasignar un día, un script de migración— sí,
-- y hacerlo bien no cuesta nada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.marcar_turno_conductor(p_driver_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_marca timestamptz := clock_timestamp();
BEGIN
  UPDATE public.drivers SET last_assigned_at = v_marca WHERE id = p_driver_id;
  RETURN v_marca;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_turno_conductor(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_turno_conductor(uuid) TO service_role;

COMMENT ON FUNCTION public.marcar_turno_conductor IS
  'Marca el turno de un conductor con clock_timestamp(), que avanza dentro de la transacción a diferencia de now().';
