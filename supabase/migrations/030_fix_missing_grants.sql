-- ============================================================
-- 030 — Fix missing grants
-- ============================================================
-- Se otorgan permisos a service_role para las tablas creadas
-- después de la migración 005 (como station_exclusivities,
-- driver_station_zones, etc) para que la API (usando useDb())
-- pueda acceder a ellas sin errores de permisos 500.
-- ============================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Asegurar que las futuras tablas también tengan estos permisos
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role, anon, authenticated;
