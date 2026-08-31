-- 002_rls_policies.sql
-- Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_prices ENABLE ROW LEVEL SECURITY;

-- Users: users can read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Drivers: public read for active drivers
CREATE POLICY "drivers_read_active" ON drivers
  FOR SELECT USING (is_active = TRUE);

-- Vehicles: public read for active vehicles
CREATE POLICY "vehicles_read_active" ON vehicles
  FOR SELECT USING (is_active = TRUE);

-- Stations: public read
CREATE POLICY "stations_read" ON stations
  FOR SELECT USING (TRUE);

-- Bookings: clients see their own bookings
CREATE POLICY "clients_own_bookings" ON bookings
  FOR SELECT USING (auth.uid() = client_id);

-- Booking assignments: drivers see their own assignments
CREATE POLICY "drivers_own_assignments" ON booking_assignments
  FOR SELECT USING (auth.uid() = driver_id);

-- Return offers: public read for active offers
CREATE POLICY "offers_read_active" ON return_offers
  FOR SELECT USING (status = 'active');

-- System config: public read
CREATE POLICY "config_read" ON system_config
  FOR SELECT USING (TRUE);

-- Route prices: public read
CREATE POLICY "route_prices_read" ON route_prices
  FOR SELECT USING (TRUE);
