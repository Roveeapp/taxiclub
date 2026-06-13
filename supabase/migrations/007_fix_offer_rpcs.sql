-- 007_fix_offer_rpcs.sql
-- La tabla return_offers tiene el orden físico de columnas con created_at y
-- booked_by_id intercambiados respecto al esperado. Las funciones que usaban
-- SELECT ro.* mapeaban por posición y fallaban con "structure of query does
-- not match function result type". Se reescriben con lista explícita de columnas.

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
  WHERE ro.status = 'active' AND ro.available_until > NOW()
  ORDER BY ro.available_from ASC;
END;
$$ LANGUAGE plpgsql;

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

GRANT EXECUTE ON FUNCTION get_driver_offers(UUID), get_active_offers(), get_offer_by_id(UUID) TO service_role, anon, authenticated;
