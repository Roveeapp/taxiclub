const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  'https://hgnsvqhizbdwawkgjciw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbnN2cWhpemJkd2F3a2dqY2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYwNTkwMSwiZXhwIjoyMDk2MTgxOTAxfQ.GZJbaqle9vd6uIUhilzgWc0XSW05_t04Oyw-ar6DCNY',
  { auth: { persistSession: false } }
)

// We'll use the REST API directly to execute DDL
const fetch = require('node-fetch')

const sql = `
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
`

fetch('https://hgnsvqhizbdwawkgjciw.supabase.co/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbnN2cWhpemJkd2F3a2dqY2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYwNTkwMSwiZXhwIjoyMDk2MTgxOTAxfQ.GZJbaqle9vd6uIUhilzgWc0XSW05_t04Oyw-ar6DCNY',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbnN2cWhpemJkd2F3a2dqY2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYwNTkwMSwiZXhwIjoyMDk2MTgxOTAxfQ.GZJbaqle9vd6uIUhilzgWc0XSW05_t04Oyw-ar6DCNY',
  },
  body: JSON.stringify({ sql })
}).then(r => r.text()).then(t => console.log('Response:', t)).catch(e => console.error('Error:', e))
