-- 010_fix_get_admin_drivers_return_type.sql
-- La columna updated_at fue añadida a drivers (migración 009), pero la función
-- get_admin_drivers usaba d.* en su RETURN QUERY, lo que desincronizó el tipo
-- de retorno declarado con la estructura real de la tabla.
-- Postgres no permite cambiar el tipo de retorno con CREATE OR REPLACE,
-- por lo que hay que hacer DROP + CREATE.

DROP FUNCTION IF EXISTS get_admin_drivers();

CREATE OR REPLACE FUNCTION get_admin_drivers()
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  email TEXT, full_name TEXT, phone TEXT, vehicle_count BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.*, u.email, u.full_name, u.phone,
         (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
  FROM drivers d
  JOIN users u ON u.id = d.id
  ORDER BY d.created_at DESC;
END;
$$;
