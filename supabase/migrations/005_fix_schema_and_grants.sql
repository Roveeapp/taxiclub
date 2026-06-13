-- 005_fix_schema_and_grants.sql
-- Correcciones de esquema detectadas al finalizar la app:
--  · La columna users.push_subscription faltaba (la usan las notificaciones push)
--  · Asegurar GRANTs para service_role sobre todas las tablas y secuencias

-- 1. Columna para guardar la suscripción Web Push del usuario/conductor
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 2. GRANTs (idempotente) para el rol de servicio usado por el backend Nitro
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
