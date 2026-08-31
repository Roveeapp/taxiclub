-- ============================================================================
-- Los suplementos y el precio de último recurso pasan a system_config
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- Estaban incrustados en el código:
--   if (needsChildSeat)    extras += 5
--   if (needsPetFriendly)  extras += 3
--   if (needsLargeVehicle) extras += 8
--   return 25   // último recurso si no hay tarifa ni estimación
--
-- Existiendo system_config y un panel en /admin/comisiones pensados justo para
-- esto, cambiar el suplemento de la silla infantil exigía un despliegue.
--
-- Los valores son los mismos que ya tenía el código, para que este cambio no
-- altere ningún precio: solo mueve de dónde se leen. Verificado tras aplicarlo:
-- una reserva con silla infantil sigue sumando 5 €.
--
-- pricing.ts los lee con un valor por defecto, así que si una clave falta el
-- cálculo no se rompe.
-- ============================================================================

INSERT INTO public.system_config (key, value) VALUES
  ('extra_child_seat',    '5'),
  ('extra_pet_friendly',  '3'),
  ('extra_large_vehicle', '8'),
  ('fallback_fare',      '25')
ON CONFLICT (key) DO NOTHING;
