-- 004_rpc_functions.sql
-- RPC functions for complex queries migrated from Drizzle raw SQL

-- 1. get_booking_by_id
CREATE OR REPLACE FUNCTION get_booking_by_id(p_id UUID, p_user_id UUID)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  confirmed_plate TEXT, confirmed_phone TEXT, confirmed_at TIMESTAMPTZ,
  origin_station_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*, ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, s.name as origin_station_name
  FROM bookings b
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.id = p_id AND b.client_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. get_driver_for_assignment
CREATE OR REPLACE FUNCTION get_driver_for_assignment(
  p_origin_station_id UUID,
  p_destination_station_id UUID,
  p_passengers INT,
  p_luggage_big INT,
  p_luggage_hand INT,
  p_needs_child_seat BOOLEAN,
  p_needs_pet_friendly BOOLEAN,
  p_needs_accessible BOOLEAN,
  p_needs_large_vehicle BOOLEAN,
  p_pickup_at TIMESTAMPTZ
) RETURNS TABLE (
  id UUID,
  last_assigned_at TIMESTAMPTZ,
  vehicle_id UUID,
  plate TEXT
) AS $$
DECLARE
  station_ids UUID[];
BEGIN
  station_ids := ARRAY[p_origin_station_id];
  IF p_destination_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_destination_station_id);
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (d.id)
    d.id,
    d.last_assigned_at,
    v.id AS vehicle_id,
    v.plate
  FROM drivers d
  JOIN driver_stations ds ON d.id = ds.driver_id
  JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE
    ds.station_id = ANY(station_ids)
    AND ds.is_active = TRUE
    AND d.is_active = TRUE
    AND v.max_passengers >= p_passengers
    AND v.max_luggage_big >= p_luggage_big
    AND v.max_luggage_hand >= p_luggage_hand
    AND (p_needs_child_seat = FALSE OR v.has_child_seat = TRUE)
    AND (p_needs_pet_friendly = FALSE OR v.has_pet_friendly = TRUE)
    AND (p_needs_accessible = FALSE OR v.is_accessible = TRUE)
    AND (p_needs_large_vehicle = FALSE OR v.is_large_vehicle = TRUE)
    AND NOT EXISTS (
      SELECT 1 FROM booking_assignments ba
      JOIN bookings b ON b.id = ba.booking_id
      WHERE ba.driver_id = d.id
        AND b.status IN ('pending','confirmed')
        AND b.pickup_at BETWEEN (p_pickup_at - INTERVAL '3 hours')
                            AND (p_pickup_at + INTERVAL '3 hours')
    )
    AND NOT EXISTS (
      SELECT 1 FROM driver_availability da
      WHERE da.driver_id = d.id
        AND da.date = p_pickup_at::date
        AND da.is_available = FALSE
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. get_vehicles_with_accessories
CREATE OR REPLACE FUNCTION get_vehicles_with_accessories(p_driver_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, plate TEXT, brand TEXT, model TEXT, year INT,
  color TEXT, max_passengers INT, max_luggage_big INT, max_luggage_hand INT,
  has_child_seat BOOLEAN, has_pet_friendly BOOLEAN, is_accessible BOOLEAN,
  is_large_vehicle BOOLEAN, is_active BOOLEAN, created_at TIMESTAMPTZ,
  accessories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.*,
    COALESCE(
      jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
        FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS accessories
  FROM vehicles v
  LEFT JOIN vehicle_accessories va ON va.vehicle_id = v.id
  LEFT JOIN accessories a ON a.id = va.accessory_id
  WHERE v.driver_id = p_driver_id AND v.is_active = TRUE
  GROUP BY v.id
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_vehicle_with_accessories
CREATE OR REPLACE FUNCTION get_vehicle_with_accessories(p_id UUID, p_driver_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, plate TEXT, brand TEXT, model TEXT, year INT,
  color TEXT, max_passengers INT, max_luggage_big INT, max_luggage_hand INT,
  has_child_seat BOOLEAN, has_pet_friendly BOOLEAN, is_accessible BOOLEAN,
  is_large_vehicle BOOLEAN, is_active BOOLEAN, created_at TIMESTAMPTZ,
  accessories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.*,
    COALESCE(
      jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'icon', a.icon))
        FILTER (WHERE a.id IS NOT NULL),
      '[]'::jsonb
    ) AS accessories
  FROM vehicles v
  LEFT JOIN vehicle_accessories va ON va.vehicle_id = v.id
  LEFT JOIN accessories a ON a.id = va.accessory_id
  WHERE v.id = p_id AND v.driver_id = p_driver_id
  GROUP BY v.id;
END;
$$ LANGUAGE plpgsql;

-- 5. get_driver_reservations
CREATE OR REPLACE FUNCTION get_driver_reservations(p_driver_id UUID)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  confirmed_plate TEXT, confirmed_phone TEXT, confirmed_at TIMESTAMPTZ,
  has_substitute BOOLEAN, substitute_plate TEXT, substitute_phone TEXT,
  origin_station_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*, ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, ba.has_substitute,
         ba.substitute_plate, ba.substitute_phone,
         s.name as origin_station_name
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE ba.driver_id = p_driver_id
  ORDER BY b.pickup_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. get_reservation_by_id
CREATE OR REPLACE FUNCTION get_reservation_by_id(p_booking_id UUID, p_driver_id UUID)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  booking_id UUID, driver_id UUID, assigned_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ,
  confirmed_plate TEXT, confirmed_phone TEXT, substitute_plate TEXT,
  substitute_phone TEXT, has_substitute BOOLEAN,
  origin_station_name TEXT, client_name TEXT, client_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*, ba.*, s.name as origin_station_name, u.full_name as client_name, u.phone as client_phone
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  LEFT JOIN users u ON u.id = b.client_id
  WHERE ba.booking_id = p_booking_id AND ba.driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- 7. get_active_offers
CREATE OR REPLACE FUNCTION get_active_offers()
RETURNS TABLE (
  id UUID, driver_id UUID, origin_booking_id UUID, origin_address TEXT,
  origin_lat DECIMAL, origin_lng DECIMAL, destination_station_id UUID,
  available_from TIMESTAMPTZ, available_until TIMESTAMPTZ, max_passengers INT,
  discount_pct INT, base_price DECIMAL, final_price DECIMAL, status TEXT,
  booked_by_id UUID, created_at TIMESTAMPTZ,
  destination_station_name TEXT, driver_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ro.id, ro.driver_id, ro.origin_booking_id, ro.origin_address,
         ro.origin_lat, ro.origin_lng, ro.destination_station_id,
         ro.available_from, ro.available_until, ro.max_passengers,
         ro.discount_pct, ro.base_price, ro.final_price, ro.status,
         ro.booked_by_id, ro.created_at,
         s.name as destination_station_name, u.full_name as driver_name
  FROM return_offers ro
  JOIN stations s ON s.id = ro.destination_station_id
  JOIN drivers d ON d.id = ro.driver_id
  JOIN users u ON u.id = d.id
  WHERE ro.status = 'active'
    AND ro.available_until > NOW()
  ORDER BY ro.available_from ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. get_offer_by_id
CREATE OR REPLACE FUNCTION get_offer_by_id(p_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, origin_booking_id UUID, origin_address TEXT,
  origin_lat DECIMAL, origin_lng DECIMAL, destination_station_id UUID,
  available_from TIMESTAMPTZ, available_until TIMESTAMPTZ, max_passengers INT,
  discount_pct INT, base_price DECIMAL, final_price DECIMAL, status TEXT,
  booked_by_id UUID, created_at TIMESTAMPTZ,
  destination_station_name TEXT, driver_name TEXT, driver_plate TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ro.id, ro.driver_id, ro.origin_booking_id, ro.origin_address,
         ro.origin_lat, ro.origin_lng, ro.destination_station_id,
         ro.available_from, ro.available_until, ro.max_passengers,
         ro.discount_pct, ro.base_price, ro.final_price, ro.status,
         ro.booked_by_id, ro.created_at,
         s.name as destination_station_name, u.full_name as driver_name,
         v.plate as driver_plate
  FROM return_offers ro
  JOIN stations s ON s.id = ro.destination_station_id
  JOIN drivers d ON d.id = ro.driver_id
  JOIN users u ON u.id = d.id
  LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE ro.id = p_id;
END;
$$ LANGUAGE plpgsql;

-- 9. get_driver_offers
CREATE OR REPLACE FUNCTION get_driver_offers(p_driver_id UUID)
RETURNS TABLE (
  id UUID, driver_id UUID, origin_booking_id UUID, origin_address TEXT,
  origin_lat DECIMAL, origin_lng DECIMAL, destination_station_id UUID,
  available_from TIMESTAMPTZ, available_until TIMESTAMPTZ, max_passengers INT,
  discount_pct INT, base_price DECIMAL, final_price DECIMAL, status TEXT,
  booked_by_id UUID, created_at TIMESTAMPTZ,
  destination_station_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ro.id, ro.driver_id, ro.origin_booking_id, ro.origin_address,
         ro.origin_lat, ro.origin_lng, ro.destination_station_id,
         ro.available_from, ro.available_until, ro.max_passengers,
         ro.discount_pct, ro.base_price, ro.final_price, ro.status,
         ro.booked_by_id, ro.created_at,
         s.name as destination_station_name
  FROM return_offers ro
  JOIN stations s ON s.id = ro.destination_station_id
  WHERE ro.driver_id = p_driver_id
  ORDER BY ro.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 10. get_driver_stations
CREATE OR REPLACE FUNCTION get_driver_stations(p_driver_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, city TEXT, address TEXT, lat DECIMAL, lng DECIMAL,
  is_active BOOLEAN, created_at TIMESTAMPTZ, joined_at TIMESTAMPTZ, is_active_ds BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.*, ds.joined_at, ds.is_active as is_active_ds
  FROM driver_stations ds
  JOIN stations s ON s.id = ds.station_id
  WHERE ds.driver_id = p_driver_id
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- 11. get_admin_drivers
CREATE OR REPLACE FUNCTION get_admin_drivers()
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  member_since DATE, is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ,
  email TEXT, full_name TEXT, phone TEXT, vehicle_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.*, u.email, u.full_name, u.phone,
         (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
  FROM drivers d
  JOIN users u ON u.id = d.id
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 12. get_admin_stations
CREATE OR REPLACE FUNCTION get_admin_stations()
RETURNS TABLE (
  id UUID, name TEXT, city TEXT, address TEXT, lat DECIMAL, lng DECIMAL,
  is_active BOOLEAN, created_at TIMESTAMPTZ,
  driver_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.*,
    (SELECT COUNT(*) FROM driver_stations ds WHERE ds.station_id = s.id AND ds.is_active = TRUE) as driver_count
  FROM stations s
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- 13. get_admin_bookings
CREATE OR REPLACE FUNCTION get_admin_bookings(p_status TEXT, p_date DATE)
RETURNS TABLE (
  id UUID, client_id UUID, origin_station_id UUID, destination_address TEXT,
  destination_lat DECIMAL, destination_lng DECIMAL, destination_station_id UUID,
  pickup_at TIMESTAMPTZ, passengers INT, luggage_big INT, luggage_hand INT,
  needs_child_seat BOOLEAN, needs_pet_friendly BOOLEAN, needs_accessible BOOLEAN,
  needs_large_vehicle BOOLEAN, base_price DECIMAL, total_price DECIMAL, status TEXT,
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  stripe_payment_intent_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  client_name TEXT, client_email TEXT,
  driver_id UUID, confirmed_plate TEXT, confirmed_phone TEXT,
  origin_station_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.*, u.full_name as client_name, u.email as client_email,
         ba.driver_id, ba.confirmed_plate, ba.confirmed_phone,
         s.name as origin_station_name
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE (p_status IS NULL OR b.status = p_status)
    AND (p_date IS NULL OR b.pickup_at::date = p_date)
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. get_admin_payouts
CREATE OR REPLACE FUNCTION get_admin_payouts()
RETURNS TABLE (
  id UUID, driver_id UUID, period_start DATE, period_end DATE,
  gross_amount DECIMAL, commission_pct DECIMAL, commission_amt DECIMAL,
  net_amount DECIMAL, membership_fee DECIMAL, final_payout DECIMAL,
  stripe_payout_id TEXT, paid_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  driver_name TEXT, driver_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT dp.*, u.full_name as driver_name, u.email as driver_email
  FROM driver_payouts dp
  JOIN drivers d ON d.id = dp.driver_id
  JOIN users u ON u.id = d.id
  ORDER BY dp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 15. get_metrics
CREATE OR REPLACE FUNCTION get_metrics(p_today DATE)
RETURNS TABLE (
  bookings_today BIGINT,
  active_drivers BIGINT,
  active_offers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM bookings WHERE created_at::date = p_today) as bookings_today,
    (SELECT COUNT(*) FROM drivers WHERE is_active = TRUE) as active_drivers,
    (SELECT COUNT(*) FROM return_offers WHERE status = 'active') as active_offers;
END;
$$ LANGUAGE plpgsql;

-- 16. get_driver_profile
CREATE OR REPLACE FUNCTION get_driver_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID, email TEXT, phone TEXT, full_name TEXT, role TEXT, created_at TIMESTAMPTZ,
  license_number TEXT, license_city TEXT, is_member BOOLEAN, member_since DATE,
  is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, driver_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.phone, u.full_name, u.role, u.created_at,
         d.license_number, d.license_city, d.is_member, d.member_since,
         d.is_exempt, d.is_active, d.last_assigned_at, d.stripe_account_id, d.created_at as driver_created_at
  FROM users u
  LEFT JOIN drivers d ON d.id = u.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 17. get_unconfirmed_assignments
CREATE OR REPLACE FUNCTION get_unconfirmed_assignments(p_threshold TIMESTAMPTZ)
RETURNS TABLE (
  id UUID, driver_id UUID, booking_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT ba.id, ba.driver_id, b.id as booking_id
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  WHERE b.status = 'pending'
    AND ba.confirmed_at IS NULL
    AND ba.assigned_at < p_threshold;
END;
$$ LANGUAGE plpgsql;

-- 18. get_active_members
CREATE OR REPLACE FUNCTION get_active_members()
RETURNS TABLE (
  id UUID, stripe_account_id TEXT, email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.stripe_account_id, u.email
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.is_member = TRUE
    AND d.is_exempt = FALSE
    AND d.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 19. get_route_price
CREATE OR REPLACE FUNCTION get_route_price(p_origin_id UUID, p_destination_id TEXT)
RETURNS TABLE (base_price DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT rp.base_price FROM route_prices rp
  WHERE rp.origin_station_id = p_origin_id
    AND (rp.destination_station_id = p_destination_id::UUID OR rp.destination_station_id IS NULL)
  LIMIT 1;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY
  SELECT rp.base_price FROM route_prices rp
  WHERE rp.origin_station_id = p_origin_id
    AND rp.destination_station_id IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 20. get_driver_payout_data
CREATE OR REPLACE FUNCTION get_driver_payout_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ,
  email TEXT, full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.*, u.email, u.full_name
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- 21. get_trips_for_payout
CREATE OR REPLACE FUNCTION get_trips_for_payout(
  p_driver_id UUID,
  p_month_start TIMESTAMPTZ,
  p_month_end TIMESTAMPTZ
) RETURNS TABLE (total_price DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT b.total_price FROM bookings b
  JOIN booking_assignments ba ON ba.booking_id = b.id
  WHERE ba.driver_id = p_driver_id
    AND b.status = 'completed'
    AND b.created_at BETWEEN p_month_start AND p_month_end;
END;
$$ LANGUAGE plpgsql;

-- 22. notify_driver_data
CREATE OR REPLACE FUNCTION notify_driver_data(p_driver_id UUID)
RETURNS TABLE (
  id UUID, license_number TEXT, license_city TEXT, is_member BOOLEAN,
  is_exempt BOOLEAN, is_active BOOLEAN, last_assigned_at TIMESTAMPTZ,
  stripe_account_id TEXT, created_at TIMESTAMPTZ,
  email TEXT, full_name TEXT, phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.*, u.email, u.full_name, u.phone
  FROM drivers d JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- 23. notify_client_confirmed_data
CREATE OR REPLACE FUNCTION notify_client_confirmed_data(p_booking_id UUID)
RETURNS TABLE (
  id UUID, email TEXT, confirmed_plate TEXT, confirmed_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, u.email, ba.confirmed_plate, ba.confirmed_phone
  FROM bookings b
  JOIN users u ON u.id = b.client_id
  JOIN booking_assignments ba ON ba.booking_id = b.id
  WHERE b.id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- 24. notify_client_cancelled_data
CREATE OR REPLACE FUNCTION notify_client_cancelled_data(p_booking_id UUID)
RETURNS TABLE (email TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.email FROM bookings b
  JOIN users u ON u.id = b.client_id
  WHERE b.id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- 25. get_driver_push_sub
CREATE OR REPLACE FUNCTION get_driver_push_sub(p_driver_id UUID)
RETURNS TABLE (push_subscription JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT u.push_subscription FROM users u WHERE u.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- 26. expire_old_offers
CREATE OR REPLACE FUNCTION expire_old_offers()
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  UPDATE return_offers
  SET status = 'expired'
  WHERE status = 'active'
    AND available_until < NOW()
  RETURNING id;
END;
$$ LANGUAGE plpgsql;

-- 27. get_active_drivers
CREATE OR REPLACE FUNCTION get_active_drivers()
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT d.id FROM drivers d WHERE d.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;
