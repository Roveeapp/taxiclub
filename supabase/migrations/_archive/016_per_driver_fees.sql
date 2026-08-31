-- ============================================================
-- 016 — Cuota y comisión personalizables por conductor
-- ============================================================
-- 1. Nuevas columnas en drivers:
--      custom_monthly_fee    → cuota mensual propia (NULL = usa la global)
--      custom_commission_pct → % comisión propio    (NULL = usa la global
--                              según sea miembro o no)
-- 2. Recrea get_admin_drivers y get_driver_payout_data con lista
--    explícita de columnas (usaban d.* y se rompen al añadir columnas;
--    de hecho get_driver_payout_data YA estaba desincronizada — le
--    faltaban member_since y updated_at — y fallaba en liquidaciones).
-- ============================================================

-- 1. Columnas nuevas
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS custom_monthly_fee NUMERIC(10,2)
    CHECK (custom_monthly_fee IS NULL OR custom_monthly_fee >= 0),
  ADD COLUMN IF NOT EXISTS custom_commission_pct NUMERIC(5,2)
    CHECK (custom_commission_pct IS NULL OR (custom_commission_pct >= 0 AND custom_commission_pct <= 100));

COMMENT ON COLUMN drivers.custom_monthly_fee IS 'Cuota mensual personalizada. NULL = usar membership_monthly_fee global.';
COMMENT ON COLUMN drivers.custom_commission_pct IS 'Comisión personalizada (%). NULL = usar commission_member_pct / commission_non_member_pct global.';

-- 2a. get_admin_drivers con columnas explícitas + campos nuevos
DROP FUNCTION IF EXISTS get_admin_drivers();

CREATE OR REPLACE FUNCTION get_admin_drivers()
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  custom_monthly_fee NUMERIC, custom_commission_pct NUMERIC,
  email TEXT, full_name TEXT, phone TEXT, vehicle_count BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct,
         u.email, u.full_name, u.phone,
         (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
  FROM drivers d
  JOIN users u ON u.id = d.id
  ORDER BY d.created_at DESC;
END;
$$;

-- 2b. get_driver_payout_data con columnas explícitas + campos nuevos
DROP FUNCTION IF EXISTS get_driver_payout_data(UUID);

CREATE OR REPLACE FUNCTION get_driver_payout_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  custom_monthly_fee NUMERIC, custom_commission_pct NUMERIC,
  email TEXT, full_name TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct,
         u.email, u.full_name
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$;
