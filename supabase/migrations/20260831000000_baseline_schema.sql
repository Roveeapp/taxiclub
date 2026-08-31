-- ============================================================================
-- BASELINE DEL ESQUEMA — generada el 2026-08-31 con `supabase db dump`
-- contra hgnsvqhizbdwawkgjciw (schema public).
--
-- POR QUÉ EXISTE
--   supabase_migrations.schema_migrations estaba VACÍA: las 32 migraciones de
--   supabase/migrations/ nunca se aplicaron por el CLI, el esquema se construyó
--   con SQL crudo. Es decir, esos ficheros no eran un registro fiable de la BD.
--   Eso no es un detalle académico: fue lo que hizo que el RLS desactivado
--   pasara desapercibido durante meses, porque 002_rls_policies.sql daba a
--   entender que estaba resuelto. Ahora están en _archive/ como histórico.
--
--   Esta baseline sí refleja el estado real: 20 tablas, 20 con RLS activo,
--   5 políticas, 9 índices, 7 triggers, 35 funciones, 220 GRANT.
--   Incluye ya los efectos de las dos migraciones posteriores
--   (20260831111338 y 20260831112130), que se conservan aparte por su valor
--   documental y son idempotentes si se reaplican.
--
-- LO QUE ESTA BASELINE **NO** CONTIENE
--   `pg_dump --schema=public` deja fuera lo que vive en otros esquemas. Un
--   `supabase db pull` posterior lo detectó y está recogido en
--   20260831114949_auth_trigger_and_storage_policies.sql:
--     · trigger on_auth_user_created sobre auth.users (crea el perfil al
--       registrarse; sin él, el alta no crea la fila en public.users)
--     · políticas driver_docs_admin y driver_docs_own sobre storage.objects
--
--   Los dos huecos que quedaban se cubrieron después:
--     · event trigger ensure_rls → 20260831121034
--     · jobs de pg_cron          → 20260831122637 (y de paso dejaron de llevar
--       la service_role key hardcodeada; ahora la leen de Vault)
--
--   Con eso, `supabase/migrations/` describe la BD por completo salvo lo que
--   gestiona Supabase (esquemas auth, storage y realtime).
--
-- SOBRE FUTUROS `supabase db pull`
--   Van a mostrar siempre el mismo ruido, que NO es drift real:
--     · 15 CREATE OR REPLACE FUNCTION. 14 funciones plpgsql tienen saltos de
--       línea CRLF en su cuerpo, y el motor de diff los normaliza distinto que
--       el volcado. Comprobado: las 15 ya están en esta baseline.
--     · un `drop extension pg_net` seguido de su recreación, porque la
--       extensión vive en el esquema public. NO ejecutarlo: tumbaría las
--       llamadas HTTP de pg_cron.
--   Lo que importa es que el diff no traiga tablas, políticas, grants ni
--   índices. Verificado el 2026-08-31: cero drift estructural.
-- ============================================================================





SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."expire_old_offers"() RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  UPDATE return_offers
  SET status = 'expired'
  WHERE status = 'active'
    AND available_until < NOW()
  RETURNING id;
END;
$$;


ALTER FUNCTION "public"."expire_old_offers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_drivers"() RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id FROM drivers d WHERE d.is_active = TRUE;
END;
$$;


ALTER FUNCTION "public"."get_active_drivers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_members"() RETURNS TABLE("id" "uuid", "stripe_account_id" "text", "email" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.stripe_account_id, u.email
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.is_member = TRUE
    AND d.is_exempt = FALSE
    AND d.is_active = TRUE;
END;
$$;


ALTER FUNCTION "public"."get_active_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_offers"() RETURNS TABLE("id" "uuid", "driver_id" "uuid", "origin_booking_id" "uuid", "origin_address" "text", "origin_lat" numeric, "origin_lng" numeric, "destination_station_id" "uuid", "available_from" timestamp with time zone, "available_until" timestamp with time zone, "max_passengers" integer, "discount_pct" integer, "base_price" numeric, "final_price" numeric, "status" "text", "booked_by_id" "uuid", "created_at" timestamp with time zone, "destination_station_name" "text", "driver_name" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_active_offers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_bookings"("p_status" "text", "p_date" "date") RETURNS TABLE("id" "uuid", "client_id" "uuid", "origin_station_id" "uuid", "destination_address" "text", "destination_lat" numeric, "destination_lng" numeric, "destination_station_id" "uuid", "pickup_at" timestamp with time zone, "passengers" integer, "luggage_big" integer, "luggage_hand" integer, "needs_child_seat" boolean, "needs_pet_friendly" boolean, "needs_accessible" boolean, "needs_large_vehicle" boolean, "base_price" numeric, "total_price" numeric, "status" "text", "cancelled_at" timestamp with time zone, "cancelled_by" "uuid", "cancellation_reason" "text", "stripe_payment_intent_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "guest_name" "text", "guest_email" "text", "guest_phone" "text", "origin_address" "text", "deposit_amount" numeric, "client_name" "text", "client_email" "text", "driver_id" "uuid", "confirmed_plate" "text", "confirmed_phone" "text", "origin_station_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.client_id, b.origin_station_id, b.destination_address,
         b.destination_lat, b.destination_lng, b.destination_station_id,
         b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
         b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
         b.needs_large_vehicle, b.base_price, b.total_price, b.status,
         b.cancelled_at, b.cancelled_by, b.cancellation_reason,
         b.stripe_payment_intent_id, b.created_at, b.updated_at,
         b.guest_name, b.guest_email, b.guest_phone,
         b.origin_address, b.deposit_amount,
         COALESCE(u.full_name, b.guest_name) AS client_name,
         COALESCE(u.email, b.guest_email) AS client_email,
         ba.driver_id, ba.confirmed_plate, ba.confirmed_phone,
         s.name AS origin_station_name
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE (p_status IS NULL OR b.status = p_status)
    AND (p_date IS NULL OR b.pickup_at::date = p_date)
  ORDER BY b.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_bookings"("p_status" "text", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_drivers"() RETURNS TABLE("id" "uuid", "license_number" "text", "license_city" "text", "is_member" boolean, "member_since" "date", "is_exempt" boolean, "is_active" boolean, "last_assigned_at" timestamp with time zone, "stripe_account_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "custom_monthly_fee" numeric, "custom_commission_pct" numeric, "is_approved" boolean, "email" "text", "full_name" "text", "phone" "text", "vehicle_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct, d.is_approved,
         u.email, u.full_name, u.phone,
         (SELECT COUNT(*) FROM vehicles v WHERE v.driver_id = d.id AND v.is_active = TRUE) as vehicle_count
  FROM drivers d
  JOIN users u ON u.id = d.id
  ORDER BY d.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_drivers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_payouts"() RETURNS TABLE("id" "uuid", "driver_id" "uuid", "period_start" "date", "period_end" "date", "gross_amount" numeric, "commission_pct" numeric, "commission_amt" numeric, "net_amount" numeric, "membership_fee" numeric, "final_payout" numeric, "stripe_payout_id" "text", "paid_at" timestamp with time zone, "created_at" timestamp with time zone, "driver_name" "text", "driver_email" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT dp.*, u.full_name as driver_name, u.email as driver_email
  FROM driver_payouts dp
  JOIN drivers d ON d.id = dp.driver_id
  JOIN users u ON u.id = d.id
  ORDER BY dp.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_payouts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_stations"() RETURNS TABLE("id" "uuid", "name" "text", "city" "text", "address" "text", "lat" numeric, "lng" numeric, "is_active" boolean, "created_at" timestamp with time zone, "driver_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.city, s.address, s.lat, s.lng,
         s.is_active, s.created_at,
         (SELECT COUNT(*) FROM driver_stations ds WHERE ds.station_id = s.id AND ds.is_active = TRUE) AS driver_count
  FROM stations s
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION "public"."get_admin_stations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking_by_id"("p_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "client_id" "uuid", "origin_station_id" "uuid", "destination_address" "text", "destination_lat" numeric, "destination_lng" numeric, "destination_station_id" "uuid", "pickup_at" timestamp with time zone, "passengers" integer, "luggage_big" integer, "luggage_hand" integer, "needs_child_seat" boolean, "needs_pet_friendly" boolean, "needs_accessible" boolean, "needs_large_vehicle" boolean, "base_price" numeric, "total_price" numeric, "status" "text", "cancelled_at" timestamp with time zone, "cancelled_by" "uuid", "cancellation_reason" "text", "stripe_payment_intent_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "guest_name" "text", "guest_email" "text", "guest_phone" "text", "origin_address" "text", "deposit_amount" numeric, "offer_id" "uuid", "confirmed_plate" "text", "confirmed_phone" "text", "confirmed_at" timestamp with time zone, "origin_station_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.client_id, b.origin_station_id, b.destination_address,
    b.destination_lat, b.destination_lng, b.destination_station_id,
    b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
    b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
    b.needs_large_vehicle, b.base_price, b.total_price, b.status,
    b.cancelled_at, b.cancelled_by, b.cancellation_reason,
    b.stripe_payment_intent_id, b.created_at, b.updated_at,
    b.guest_name, b.guest_email, b.guest_phone,
    b.origin_address, b.deposit_amount, b.offer_id,
    ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at,
    s.name AS origin_station_name
  FROM bookings b
  LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.id = p_id
    AND (
      b.client_id IS NULL
      OR b.client_id = p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."get_booking_by_id"("p_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_for_assignment"("p_origin_station_id" "uuid", "p_destination_station_id" "uuid", "p_passengers" integer, "p_luggage_big" integer, "p_luggage_hand" integer, "p_needs_child_seat" boolean, "p_needs_pet_friendly" boolean, "p_needs_accessible" boolean, "p_needs_large_vehicle" boolean, "p_pickup_at" timestamp with time zone, "p_dest_lat" numeric DEFAULT NULL::numeric, "p_dest_lng" numeric DEFAULT NULL::numeric, "p_origin_lat" numeric DEFAULT NULL::numeric, "p_origin_lng" numeric DEFAULT NULL::numeric) RETURNS TABLE("id" "uuid", "last_assigned_at" timestamp with time zone, "vehicle_id" "uuid", "plate" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  station_ids UUID[];
  pickup_local TIMESTAMP;
  exclusive_driver UUID;
BEGIN
  station_ids := ARRAY[]::UUID[];
  IF p_origin_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_origin_station_id);
  END IF;
  IF p_destination_station_id IS NOT NULL THEN
    station_ids := array_append(station_ids, p_destination_station_id);
  END IF;

  pickup_local := p_pickup_at AT TIME ZONE 'Europe/Madrid';

  -- 1. Exclusividad por parada (decisión del admin)
  IF cardinality(station_ids) > 0 THEN
    SELECT se.driver_id INTO exclusive_driver
    FROM station_exclusivities se
    WHERE se.station_id = ANY(station_ids)
    LIMIT 1;

    IF exclusive_driver IS NOT NULL THEN
      RETURN QUERY
      SELECT d.id, d.last_assigned_at, v.id AS vehicle_id, v.plate
      FROM drivers d
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      WHERE d.id = exclusive_driver
        AND d.is_active = TRUE
        AND d.is_approved = TRUE
      ORDER BY v.created_at ASC
      LIMIT 1;

      IF FOUND THEN
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 2. Round-robin: solo miembros, respetando zonas excluidas
  RETURN QUERY
  SELECT DISTINCT ON (d.id)
    d.id,
    d.last_assigned_at,
    v.id AS vehicle_id,
    v.plate
  FROM drivers d
  JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
  WHERE
    d.is_active = TRUE
    AND d.is_approved = TRUE
    AND d.is_member = TRUE
    AND (
      cardinality(station_ids) = 0
      OR EXISTS (
        SELECT 1 FROM driver_stations ds
        WHERE ds.driver_id = d.id
          AND ds.is_active = TRUE
          AND ds.station_id = ANY(station_ids)
      )
    )
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
        AND da.date = pickup_local::date
        AND da.is_available = FALSE
    )
    -- Anillos excluidos: descarta al conductor si ORIGEN y DESTINO
    -- caen ambos dentro del anillo (desde la parada del anillo).
    AND NOT EXISTS (
      SELECT 1
      FROM driver_station_zones z
      JOIN stations s ON s.id = z.station_id
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN p_origin_station_id = z.station_id THEN 0::double precision
            WHEN p_origin_lat IS NOT NULL AND p_origin_lng IS NOT NULL
              THEN haversine_km(s.lat, s.lng, p_origin_lat, p_origin_lng)
            ELSE NULL
          END AS origin_dist,
          CASE
            WHEN p_dest_lat IS NOT NULL AND p_dest_lng IS NOT NULL
              THEN haversine_km(s.lat, s.lng, p_dest_lat, p_dest_lng)
            ELSE NULL
          END AS dest_dist
      ) dist
      WHERE z.driver_id = d.id
        AND z.mode = 'exclude'
        AND s.lat IS NOT NULL AND s.lng IS NOT NULL
        AND dist.origin_dist IS NOT NULL
        AND dist.dest_dist IS NOT NULL
        AND dist.origin_dist >= z.radius_from_km AND dist.origin_dist < z.radius_to_km
        AND dist.dest_dist >= z.radius_from_km AND dist.dest_dist < z.radius_to_km
    )
  ORDER BY d.id, d.last_assigned_at ASC NULLS FIRST
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_driver_for_assignment"("p_origin_station_id" "uuid", "p_destination_station_id" "uuid", "p_passengers" integer, "p_luggage_big" integer, "p_luggage_hand" integer, "p_needs_child_seat" boolean, "p_needs_pet_friendly" boolean, "p_needs_accessible" boolean, "p_needs_large_vehicle" boolean, "p_pickup_at" timestamp with time zone, "p_dest_lat" numeric, "p_dest_lng" numeric, "p_origin_lat" numeric, "p_origin_lng" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_offers"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "driver_id" "uuid", "origin_booking_id" "uuid", "origin_address" "text", "origin_lat" numeric, "origin_lng" numeric, "destination_station_id" "uuid", "available_from" timestamp with time zone, "available_until" timestamp with time zone, "max_passengers" integer, "discount_pct" integer, "base_price" numeric, "final_price" numeric, "status" "text", "booked_by_id" "uuid", "created_at" timestamp with time zone, "destination_station_name" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_driver_offers"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_payout_data"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "license_number" "text", "license_city" "text", "is_member" boolean, "member_since" "date", "is_exempt" boolean, "is_active" boolean, "last_assigned_at" timestamp with time zone, "stripe_account_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "custom_monthly_fee" numeric, "custom_commission_pct" numeric, "is_approved" boolean, "email" "text", "full_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.member_since, d.is_exempt, d.is_active, d.last_assigned_at,
         d.stripe_account_id, d.created_at, d.updated_at,
         d.custom_monthly_fee, d.custom_commission_pct, d.is_approved,
         u.email, u.full_name
  FROM drivers d
  JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$;


ALTER FUNCTION "public"."get_driver_payout_data"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_profile"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "phone" "text", "full_name" "text", "role" "text", "created_at" timestamp with time zone, "license_number" "text", "license_city" "text", "is_member" boolean, "member_since" "date", "is_exempt" boolean, "is_active" boolean, "last_assigned_at" timestamp with time zone, "stripe_account_id" "text", "driver_created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.phone, u.full_name, u.role, u.created_at,
         d.license_number, d.license_city, d.is_member, d.member_since,
         d.is_exempt, d.is_active, d.last_assigned_at, d.stripe_account_id, d.created_at as driver_created_at
  FROM users u
  LEFT JOIN drivers d ON d.id = u.id
  WHERE u.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_driver_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_push_sub"("p_driver_id" "uuid") RETURNS TABLE("push_subscription" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.push_subscription FROM users u WHERE u.id = p_driver_id;
END;
$$;


ALTER FUNCTION "public"."get_driver_push_sub"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_reservations"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "client_id" "uuid", "origin_station_id" "uuid", "destination_address" "text", "destination_lat" numeric, "destination_lng" numeric, "destination_station_id" "uuid", "pickup_at" timestamp with time zone, "passengers" integer, "luggage_big" integer, "luggage_hand" integer, "needs_child_seat" boolean, "needs_pet_friendly" boolean, "needs_accessible" boolean, "needs_large_vehicle" boolean, "base_price" numeric, "total_price" numeric, "status" "text", "cancelled_at" timestamp with time zone, "cancelled_by" "uuid", "cancellation_reason" "text", "stripe_payment_intent_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "guest_name" "text", "guest_email" "text", "guest_phone" "text", "origin_address" "text", "deposit_amount" numeric, "confirmed_plate" "text", "confirmed_phone" "text", "confirmed_at" timestamp with time zone, "has_substitute" boolean, "substitute_plate" "text", "substitute_phone" "text", "origin_station_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.client_id, b.origin_station_id, b.destination_address,
         b.destination_lat, b.destination_lng, b.destination_station_id,
         b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
         b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
         b.needs_large_vehicle, b.base_price, b.total_price, b.status,
         b.cancelled_at, b.cancelled_by, b.cancellation_reason,
         b.stripe_payment_intent_id, b.created_at, b.updated_at,
         b.guest_name, b.guest_email, b.guest_phone,
         b.origin_address, b.deposit_amount,
         ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, ba.has_substitute,
         ba.substitute_plate, ba.substitute_phone,
         s.name AS origin_station_name
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE ba.driver_id = p_driver_id
  ORDER BY b.pickup_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_driver_reservations"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_stations"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "city" "text", "address" "text", "lat" numeric, "lng" numeric, "is_active" boolean, "created_at" timestamp with time zone, "joined_at" timestamp with time zone, "is_active_ds" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.city, s.address, s.lat, s.lng,
         s.is_active, s.created_at,
         ds.joined_at, ds.is_active AS is_active_ds
  FROM driver_stations ds
  JOIN stations s ON s.id = ds.station_id
  WHERE ds.driver_id = p_driver_id
  ORDER BY s.name;
END;
$$;


ALTER FUNCTION "public"."get_driver_stations"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metrics"("p_today" "date") RETURNS TABLE("bookings_today" bigint, "active_drivers" bigint, "active_offers" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM bookings WHERE created_at::date = p_today) as bookings_today,
    (SELECT COUNT(*) FROM drivers WHERE is_active = TRUE) as active_drivers,
    (SELECT COUNT(*) FROM return_offers WHERE status = 'active') as active_offers;
END;
$$;


ALTER FUNCTION "public"."get_metrics"("p_today" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_offer_by_id"("p_id" "uuid") RETURNS TABLE("id" "uuid", "driver_id" "uuid", "origin_booking_id" "uuid", "origin_address" "text", "origin_lat" numeric, "origin_lng" numeric, "destination_station_id" "uuid", "available_from" timestamp with time zone, "available_until" timestamp with time zone, "max_passengers" integer, "discount_pct" integer, "base_price" numeric, "final_price" numeric, "status" "text", "booked_by_id" "uuid", "created_at" timestamp with time zone, "destination_station_name" "text", "driver_name" "text", "driver_plate" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_offer_by_id"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reservation_by_id"("p_booking_id" "uuid", "p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "client_id" "uuid", "origin_station_id" "uuid", "destination_address" "text", "destination_lat" numeric, "destination_lng" numeric, "destination_station_id" "uuid", "pickup_at" timestamp with time zone, "passengers" integer, "luggage_big" integer, "luggage_hand" integer, "needs_child_seat" boolean, "needs_pet_friendly" boolean, "needs_accessible" boolean, "needs_large_vehicle" boolean, "base_price" numeric, "total_price" numeric, "status" "text", "cancelled_at" timestamp with time zone, "cancelled_by" "uuid", "cancellation_reason" "text", "stripe_payment_intent_id" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "booking_id" "uuid", "driver_id" "uuid", "assigned_at" timestamp with time zone, "confirmed_at" timestamp with time zone, "confirmed_plate" "text", "confirmed_phone" "text", "substitute_plate" "text", "substitute_phone" "text", "has_substitute" boolean, "origin_station_name" "text", "client_name" "text", "client_phone" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.client_id, b.origin_station_id, b.destination_address,
         b.destination_lat, b.destination_lng, b.destination_station_id,
         b.pickup_at, b.passengers, b.luggage_big, b.luggage_hand,
         b.needs_child_seat, b.needs_pet_friendly, b.needs_accessible,
         b.needs_large_vehicle, b.base_price, b.total_price, b.status,
         b.cancelled_at, b.cancelled_by, b.cancellation_reason,
         b.stripe_payment_intent_id, b.created_at, b.updated_at,
         ba.booking_id, ba.driver_id, ba.assigned_at, ba.confirmed_at,
         ba.confirmed_plate, ba.confirmed_phone, ba.substitute_plate,
         ba.substitute_phone, ba.has_substitute,
         s.name AS origin_station_name, 
         COALESCE(u.full_name, b.guest_name) AS client_name, 
         COALESCE(u.phone, b.guest_phone) AS client_phone
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  LEFT JOIN users u ON u.id = b.client_id
  WHERE ba.booking_id = p_booking_id AND ba.driver_id = p_driver_id;
END;
$$;


ALTER FUNCTION "public"."get_reservation_by_id"("p_booking_id" "uuid", "p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_route_price"("p_origin_id" "uuid", "p_destination_id" "text") RETURNS TABLE("base_price" numeric)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_route_price"("p_origin_id" "uuid", "p_destination_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trips_for_payout"("p_driver_id" "uuid", "p_month_start" timestamp with time zone, "p_month_end" timestamp with time zone) RETURNS TABLE("total_price" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.total_price FROM bookings b
  JOIN booking_assignments ba ON ba.booking_id = b.id
  WHERE ba.driver_id = p_driver_id
    AND b.status = 'completed'
    AND b.created_at BETWEEN p_month_start AND p_month_end;
END;
$$;


ALTER FUNCTION "public"."get_trips_for_payout"("p_driver_id" "uuid", "p_month_start" timestamp with time zone, "p_month_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unconfirmed_assignments"("p_threshold" timestamp with time zone) RETURNS TABLE("id" "uuid", "driver_id" "uuid", "booking_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT ba.id, ba.driver_id, b.id as booking_id
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  WHERE b.status = 'pending'
    AND ba.confirmed_at IS NULL
    AND ba.assigned_at < p_threshold;
END;
$$;


ALTER FUNCTION "public"."get_unconfirmed_assignments"("p_threshold" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unconfirmed_assignments_v2"("p_threshold" timestamp with time zone) RETURNS TABLE("id" "uuid", "driver_id" "uuid", "booking_id" "uuid", "driver_email" "text", "driver_name" "text", "origin_station_name" "text", "destination_address" "text", "pickup_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT ba.id, ba.driver_id, b.id AS booking_id,
         u.email AS driver_email, u.full_name AS driver_name,
         s.name AS origin_station_name, b.destination_address, b.pickup_at
  FROM booking_assignments ba
  JOIN bookings b ON b.id = ba.booking_id
  JOIN users u ON u.id = ba.driver_id
  LEFT JOIN stations s ON s.id = b.origin_station_id
  WHERE b.status = 'pending'
    AND ba.confirmed_at IS NULL
    AND ba.assigned_at < p_threshold;
END;
$$;


ALTER FUNCTION "public"."get_unconfirmed_assignments_v2"("p_threshold" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    'client'
  );
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vehicle_with_accessories"("p_id" "uuid", "p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "driver_id" "uuid", "plate" "text", "brand" "text", "model" "text", "year" integer, "color" "text", "max_passengers" integer, "max_luggage_big" integer, "max_luggage_hand" integer, "has_child_seat" boolean, "has_pet_friendly" boolean, "is_accessible" boolean, "is_large_vehicle" boolean, "is_active" boolean, "created_at" timestamp with time zone, "photo_url" "text", "accessories" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.driver_id, v.plate, v.brand, v.model, v.year,
         v.color, v.max_passengers, v.max_luggage_big, v.max_luggage_hand,
         v.has_child_seat, v.has_pet_friendly, v.is_accessible,
         v.is_large_vehicle, v.is_active, v.created_at,
         v.photo_url,
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
$$;


ALTER FUNCTION "public"."get_vehicle_with_accessories"("p_id" "uuid", "p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vehicles_with_accessories"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "driver_id" "uuid", "plate" "text", "brand" "text", "model" "text", "year" integer, "color" "text", "max_passengers" integer, "max_luggage_big" integer, "max_luggage_hand" integer, "has_child_seat" boolean, "has_pet_friendly" boolean, "is_accessible" boolean, "is_large_vehicle" boolean, "is_active" boolean, "created_at" timestamp with time zone, "photo_url" "text", "accessories" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.driver_id, v.plate, v.brand, v.model, v.year,
         v.color, v.max_passengers, v.max_luggage_big, v.max_luggage_hand,
         v.has_child_seat, v.has_pet_friendly, v.is_accessible,
         v.is_large_vehicle, v.is_active, v.created_at,
         v.photo_url,
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
$$;


ALTER FUNCTION "public"."get_vehicles_with_accessories"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  -- Si se registra como conductor, crear su ficha de driver con datos pendientes
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'driver' THEN
    INSERT INTO public.drivers (id, license_number, license_city)
    VALUES (NEW.id, 'PENDING', 'PENDING')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."haversine_km"("lat1" numeric, "lng1" numeric, "lat2" numeric, "lng2" numeric) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians((lng2 - lng1) / 2)), 2)
  ))
$$;


ALTER FUNCTION "public"."haversine_km"("lat1" numeric, "lng1" numeric, "lat2" numeric, "lng2" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_client_cancelled_data"("p_booking_id" "uuid") RETURNS TABLE("email" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(u.email, b.guest_email) AS email
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  WHERE b.id = p_booking_id
    AND COALESCE(u.email, b.guest_email) IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."notify_client_cancelled_data"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_client_confirmed_data"("p_booking_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "confirmed_plate" "text", "confirmed_phone" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, COALESCE(u.email, b.guest_email) AS email, ba.confirmed_plate, ba.confirmed_phone
  FROM bookings b
  LEFT JOIN users u ON u.id = b.client_id
  JOIN booking_assignments ba ON ba.booking_id = b.id
  WHERE b.id = p_booking_id
    AND COALESCE(u.email, b.guest_email) IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."notify_client_confirmed_data"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_driver_data"("p_driver_id" "uuid") RETURNS TABLE("id" "uuid", "license_number" "text", "license_city" "text", "is_member" boolean, "is_exempt" boolean, "is_active" boolean, "last_assigned_at" timestamp with time zone, "stripe_account_id" "text", "created_at" timestamp with time zone, "email" "text", "full_name" "text", "phone" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.license_number, d.license_city, d.is_member,
         d.is_exempt, d.is_active, d.last_assigned_at, d.stripe_account_id,
         d.created_at, u.email, u.full_name, u.phone
  FROM drivers d JOIN users u ON u.id = d.id
  WHERE d.id = p_driver_id;
END;
$$;


ALTER FUNCTION "public"."notify_driver_data"("p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_booking_on_confirm"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Solo cuando confirmed_at pasa de NULL a un valor
  IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN
    UPDATE public.bookings
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = NEW.booking_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_booking_on_confirm"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accessories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text"
);


ALTER TABLE "public"."accessories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "confirmed_at" timestamp with time zone,
    "confirmed_plate" "text",
    "confirmed_phone" "text",
    "has_substitute" boolean DEFAULT false,
    "substitute_plate" "text",
    "substitute_phone" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."booking_assignments" REPLICA IDENTITY FULL;


ALTER TABLE "public"."booking_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."booking_assignments" IS 'Una reserva tiene exactamente una asignación. El cliente ve confirmed_plate y confirmed_phone solo tras confirmación.';



CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "origin_station_id" "uuid",
    "destination_address" "text" NOT NULL,
    "destination_lat" numeric(9,6),
    "destination_lng" numeric(9,6),
    "destination_station_id" "uuid",
    "pickup_at" timestamp with time zone NOT NULL,
    "passengers" integer DEFAULT 1 NOT NULL,
    "luggage_big" integer DEFAULT 0 NOT NULL,
    "luggage_hand" integer DEFAULT 0 NOT NULL,
    "needs_child_seat" boolean DEFAULT false,
    "needs_pet_friendly" boolean DEFAULT false,
    "needs_accessible" boolean DEFAULT false,
    "needs_large_vehicle" boolean DEFAULT false,
    "base_price" numeric(8,2) NOT NULL,
    "total_price" numeric(8,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "cancellation_reason" "text",
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "guest_name" "text",
    "guest_email" "text",
    "guest_phone" "text",
    "origin_address" "text",
    "deposit_amount" numeric(8,2),
    "offer_id" "uuid",
    "origin_lat" numeric(9,6),
    "origin_lng" numeric(9,6)
);

ALTER TABLE ONLY "public"."bookings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON TABLE "public"."bookings" IS 'Reservas de clientes. Estado: pending → confirmed → completed | cancelled';



COMMENT ON COLUMN "public"."bookings"."destination_station_id" IS 'Poblado si el destino coincide con una parada registrada. Activa el pool combinado en el round-robin.';



COMMENT ON COLUMN "public"."bookings"."origin_address" IS 'Origen en texto libre (si no hay parada)';



COMMENT ON COLUMN "public"."bookings"."deposit_amount" IS 'Señal pre-autorizada vía Stripe (reservas de ofertas). NULL = pago completo';



COMMENT ON COLUMN "public"."bookings"."offer_id" IS 'Oferta de Última Hora reservada, si aplica';



CREATE TABLE IF NOT EXISTS "public"."driver_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "is_available" boolean DEFAULT true,
    "hour_from" time without time zone,
    "hour_to" time without time zone,
    "time_slots" "jsonb"
);


ALTER TABLE "public"."driver_availability" OWNER TO "postgres";


COMMENT ON TABLE "public"."driver_availability" IS 'Por defecto el conductor está disponible. Solo se registran las EXCEPCIONES (días no disponibles).';



CREATE TABLE IF NOT EXISTS "public"."driver_fixed_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "origin_label" "text" NOT NULL,
    "origin_lat" numeric(9,6),
    "origin_lng" numeric(9,6),
    "origin_station_id" "uuid",
    "dest_label" "text" NOT NULL,
    "dest_lat" numeric(9,6),
    "dest_lng" numeric(9,6),
    "dest_station_id" "uuid",
    "price" numeric(8,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "driver_fixed_routes_price_check" CHECK (("price" > (0)::numeric))
);


ALTER TABLE "public"."driver_fixed_routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "gross_amount" numeric(10,2) NOT NULL,
    "commission_pct" numeric(5,2) NOT NULL,
    "commission_amt" numeric(10,2) NOT NULL,
    "net_amount" numeric(10,2) NOT NULL,
    "membership_fee" numeric(6,2) DEFAULT 0,
    "final_payout" numeric(10,2) NOT NULL,
    "stripe_payout_id" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."driver_payouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."driver_payouts" IS 'Liquidación mensual de cada conductor. Se genera el día 1 de cada mes y se transfiere vía Stripe Connect.';



CREATE TABLE IF NOT EXISTS "public"."driver_station_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "radius_from_km" numeric(6,1) DEFAULT 0 NOT NULL,
    "radius_to_km" numeric(6,1) NOT NULL,
    "mode" "text" NOT NULL,
    "fixed_price" numeric(8,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "driver_station_zones_check" CHECK (("radius_to_km" > "radius_from_km")),
    CONSTRAINT "driver_station_zones_check1" CHECK ((("mode" <> 'fixed_price'::"text") OR ("fixed_price" IS NOT NULL))),
    CONSTRAINT "driver_station_zones_fixed_price_check" CHECK ((("fixed_price" IS NULL) OR ("fixed_price" > (0)::numeric))),
    CONSTRAINT "driver_station_zones_mode_check" CHECK (("mode" = ANY (ARRAY['exclude'::"text", 'fixed_price'::"text"]))),
    CONSTRAINT "driver_station_zones_radius_from_km_check" CHECK (("radius_from_km" >= (0)::numeric)),
    CONSTRAINT "driver_station_zones_radius_to_km_check" CHECK (("radius_to_km" > (0)::numeric))
);


ALTER TABLE "public"."driver_station_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_stations" (
    "driver_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."driver_stations" OWNER TO "postgres";


COMMENT ON TABLE "public"."driver_stations" IS 'Un conductor en la parada X entra en el pool para viajes DESDE X y también HACIA X (bidireccional)';



CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" NOT NULL,
    "license_number" "text" NOT NULL,
    "license_city" "text" NOT NULL,
    "is_member" boolean DEFAULT false,
    "member_since" "date",
    "is_exempt" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "last_assigned_at" timestamp with time zone,
    "stripe_account_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_monthly_fee" numeric(10,2),
    "custom_commission_pct" numeric(5,2),
    "is_approved" boolean DEFAULT false,
    "custom_price_per_km" numeric(6,2),
    CONSTRAINT "drivers_custom_commission_pct_check" CHECK ((("custom_commission_pct" IS NULL) OR (("custom_commission_pct" >= (0)::numeric) AND ("custom_commission_pct" <= (100)::numeric)))),
    CONSTRAINT "drivers_custom_monthly_fee_check" CHECK ((("custom_monthly_fee" IS NULL) OR ("custom_monthly_fee" >= (0)::numeric))),
    CONSTRAINT "drivers_custom_price_per_km_check" CHECK ((("custom_price_per_km" IS NULL) OR (("custom_price_per_km" > (0)::numeric) AND ("custom_price_per_km" <= (100)::numeric))))
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."drivers"."is_exempt" IS 'Exento de la cuota mensual — para los taxistas fundadores del MVP';



COMMENT ON COLUMN "public"."drivers"."last_assigned_at" IS 'Timestamp de la última reserva recibida. NULL = nunca asignado. Usado para el orden del pool round-robin.';



COMMENT ON COLUMN "public"."drivers"."custom_monthly_fee" IS 'Cuota mensual personalizada. NULL = usar membership_monthly_fee global.';



COMMENT ON COLUMN "public"."drivers"."custom_commission_pct" IS 'Comisión personalizada (%). NULL = usar commission_member_pct / commission_non_member_pct global.';



COMMENT ON COLUMN "public"."drivers"."is_approved" IS 'Aprobado por el admin. Sin aprobación no recibe asignaciones.';



COMMENT ON COLUMN "public"."drivers"."custom_price_per_km" IS 'Tarifa €/km del conductor. NULL = usar price_per_km global.';



CREATE TABLE IF NOT EXISTS "public"."integration_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_settings" IS 'Claves de integraciones (stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, resend_api_key, email_from, twilio_account_sid, twilio_auth_token, twilio_phone_number). Prioridad sobre env.';



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "amount" numeric(6,2) NOT NULL,
    "is_exempt" boolean DEFAULT false,
    "stripe_invoice_id" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."memberships" IS 'Registro de cuotas mensuales del club. 20€/mes salvo exención.';



CREATE TABLE IF NOT EXISTS "public"."return_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "origin_booking_id" "uuid",
    "origin_address" "text" NOT NULL,
    "origin_lat" numeric(9,6),
    "origin_lng" numeric(9,6),
    "destination_station_id" "uuid" NOT NULL,
    "available_from" timestamp with time zone NOT NULL,
    "available_until" timestamp with time zone NOT NULL,
    "max_passengers" integer DEFAULT 4 NOT NULL,
    "discount_pct" integer DEFAULT 0 NOT NULL,
    "base_price" numeric(8,2) NOT NULL,
    "final_price" numeric(8,2) NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "booked_by_id" "uuid"
);


ALTER TABLE "public"."return_offers" OWNER TO "postgres";


COMMENT ON TABLE "public"."return_offers" IS 'Ofertas de retorno publicadas por taxistas. Pre-asignadas al conductor que las crea (no pasan por round-robin). Expiran automáticamente.';



CREATE TABLE IF NOT EXISTS "public"."route_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "origin_station_id" "uuid",
    "destination_station_id" "uuid",
    "destination_city" "text",
    "base_price" numeric(8,2) NOT NULL,
    "is_return" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."route_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."route_prices" IS 'Tabla de precios fija para el MVP. Fase 2: reemplazar por cálculo dinámico Google Maps.';



CREATE TABLE IF NOT EXISTS "public"."saved_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "address" "text" NOT NULL,
    "lat" numeric(9,6),
    "lng" numeric(9,6),
    "is_favorite" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."station_exclusivities" (
    "station_id" "uuid" NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."station_exclusivities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "address" "text",
    "lat" numeric(9,6),
    "lng" numeric(9,6),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stations" OWNER TO "postgres";


COMMENT ON TABLE "public"."stations" IS 'Paradas/estaciones donde operan los taxistas. Son afiliaciones bidireccionales (origen y destino).';



CREATE TABLE IF NOT EXISTS "public"."system_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_config" IS 'Parámetros globales configurables desde el panel admin';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "full_name" "text",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "push_subscription" "jsonb"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Extensión de auth.users con datos de la aplicación';



COMMENT ON COLUMN "public"."users"."role" IS 'client | driver | admin';



CREATE TABLE IF NOT EXISTS "public"."vehicle_accessories" (
    "vehicle_id" "uuid" NOT NULL,
    "accessory_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vehicle_accessories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "driver_id" "uuid" NOT NULL,
    "plate" "text" NOT NULL,
    "brand" "text" NOT NULL,
    "model" "text" NOT NULL,
    "year" integer,
    "color" "text",
    "max_passengers" integer DEFAULT 4 NOT NULL,
    "max_luggage_big" integer DEFAULT 2 NOT NULL,
    "max_luggage_hand" integer DEFAULT 4 NOT NULL,
    "has_child_seat" boolean DEFAULT false,
    "has_pet_friendly" boolean DEFAULT false,
    "is_accessible" boolean DEFAULT false,
    "is_large_vehicle" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "photo_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


COMMENT ON TABLE "public"."vehicles" IS 'Un taxista puede tener varios vehículos. El algoritmo filtra por capacidades del vehículo activo.';



ALTER TABLE ONLY "public"."accessories"
    ADD CONSTRAINT "accessories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_assignments"
    ADD CONSTRAINT "booking_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_stripe_payment_intent_id_unique" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."driver_availability"
    ADD CONSTRAINT "driver_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_fixed_routes"
    ADD CONSTRAINT "driver_fixed_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_payouts"
    ADD CONSTRAINT "driver_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_station_zones"
    ADD CONSTRAINT "driver_station_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_license_number_unique" UNIQUE ("license_number");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_settings"
    ADD CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_offers"
    ADD CONSTRAINT "return_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."route_prices"
    ADD CONSTRAINT "route_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_addresses"
    ADD CONSTRAINT "saved_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_exclusivities"
    ADD CONSTRAINT "station_exclusivities_pkey" PRIMARY KEY ("station_id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_config"
    ADD CONSTRAINT "system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_accessories"
    ADD CONSTRAINT "vehicle_accessories_pkey" PRIMARY KEY ("vehicle_id", "accessory_id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "accessories_slug_key" ON "public"."accessories" USING "btree" ("slug");



CREATE UNIQUE INDEX "driver_availability_driver_date_key" ON "public"."driver_availability" USING "btree" ("driver_id", "date");



CREATE INDEX "idx_booking_assignments_booking" ON "public"."booking_assignments" USING "btree" ("booking_id");



CREATE INDEX "idx_bookings_client" ON "public"."bookings" USING "btree" ("client_id");



CREATE INDEX "idx_bookings_pickup" ON "public"."bookings" USING "btree" ("pickup_at");



CREATE INDEX "idx_bookings_status" ON "public"."bookings" USING "btree" ("status");



CREATE INDEX "idx_dfr_driver" ON "public"."driver_fixed_routes" USING "btree" ("driver_id");



CREATE INDEX "idx_dfr_stations" ON "public"."driver_fixed_routes" USING "btree" ("origin_station_id", "dest_station_id") WHERE (("origin_station_id" IS NOT NULL) AND ("dest_station_id" IS NOT NULL));



CREATE INDEX "idx_dsz_driver_station" ON "public"."driver_station_zones" USING "btree" ("driver_id", "station_id");



CREATE OR REPLACE TRIGGER "trg_bookings_updated_at" BEFORE UPDATE ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_config_updated_at" BEFORE UPDATE ON "public"."system_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_drivers_updated_at" BEFORE UPDATE ON "public"."drivers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_prices_updated_at" BEFORE UPDATE ON "public"."route_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sync_booking_on_confirm" AFTER UPDATE ON "public"."booking_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."sync_booking_on_confirm"();



CREATE OR REPLACE TRIGGER "trg_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_vehicles_updated_at" BEFORE UPDATE ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."booking_assignments"
    ADD CONSTRAINT "booking_assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_assignments"
    ADD CONSTRAINT "booking_assignments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_destination_station_id_stations_id_fk" FOREIGN KEY ("destination_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."return_offers"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_origin_station_id_stations_id_fk" FOREIGN KEY ("origin_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."driver_availability"
    ADD CONSTRAINT "driver_availability_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_fixed_routes"
    ADD CONSTRAINT "driver_fixed_routes_dest_station_id_fkey" FOREIGN KEY ("dest_station_id") REFERENCES "public"."stations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."driver_fixed_routes"
    ADD CONSTRAINT "driver_fixed_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_fixed_routes"
    ADD CONSTRAINT "driver_fixed_routes_origin_station_id_fkey" FOREIGN KEY ("origin_station_id") REFERENCES "public"."stations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."driver_payouts"
    ADD CONSTRAINT "driver_payouts_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id");



ALTER TABLE ONLY "public"."driver_station_zones"
    ADD CONSTRAINT "driver_station_zones_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_station_zones"
    ADD CONSTRAINT "driver_station_zones_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_stations"
    ADD CONSTRAINT "driver_stations_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_stations"
    ADD CONSTRAINT "driver_stations_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id");



ALTER TABLE ONLY "public"."return_offers"
    ADD CONSTRAINT "return_offers_booked_by_id_bookings_id_fk" FOREIGN KEY ("booked_by_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."return_offers"
    ADD CONSTRAINT "return_offers_destination_station_id_stations_id_fk" FOREIGN KEY ("destination_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."return_offers"
    ADD CONSTRAINT "return_offers_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id");



ALTER TABLE ONLY "public"."return_offers"
    ADD CONSTRAINT "return_offers_origin_booking_id_bookings_id_fk" FOREIGN KEY ("origin_booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."route_prices"
    ADD CONSTRAINT "route_prices_destination_station_id_stations_id_fk" FOREIGN KEY ("destination_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."route_prices"
    ADD CONSTRAINT "route_prices_origin_station_id_stations_id_fk" FOREIGN KEY ("origin_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."saved_addresses"
    ADD CONSTRAINT "saved_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_exclusivities"
    ADD CONSTRAINT "station_exclusivities_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_exclusivities"
    ADD CONSTRAINT "station_exclusivities_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_accessories"
    ADD CONSTRAINT "vehicle_accessories_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "public"."accessories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_accessories"
    ADD CONSTRAINT "vehicle_accessories_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE CASCADE;



ALTER TABLE "public"."accessories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accessories_read_active" ON "public"."accessories" FOR SELECT USING (("is_active" = true));



CREATE POLICY "assignments_client_select" ON "public"."booking_assignments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."bookings" "b"
  WHERE (("b"."id" = "booking_assignments"."booking_id") AND ("b"."client_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."booking_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bookings_client_select" ON "public"."bookings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "client_id"));



ALTER TABLE "public"."driver_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_fixed_routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_payouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_station_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_stations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."return_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."route_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."station_exclusivities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stations_public_select" ON "public"."stations" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."system_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicle_accessories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicle_accessories_driver" ON "public"."vehicle_accessories" USING ((EXISTS ( SELECT 1
   FROM "public"."vehicles" "v"
  WHERE (("v"."id" = "vehicle_accessories"."vehicle_id") AND ("v"."driver_id" = "auth"."uid"())))));



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."booking_assignments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."return_offers";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."expire_old_offers"() TO "service_role";
GRANT ALL ON FUNCTION "public"."expire_old_offers"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_offers"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_active_drivers"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_active_drivers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_drivers"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_active_members"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_active_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_members"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_active_offers"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_active_offers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_offers"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_admin_payouts"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_admin_payouts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_payouts"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_booking_by_id"("p_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_booking_by_id"("p_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_booking_by_id"("p_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_driver_offers"("p_driver_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_driver_offers"("p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_driver_offers"("p_driver_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_driver_profile"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_driver_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_driver_profile"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_driver_push_sub"("p_driver_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_driver_push_sub"("p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_driver_push_sub"("p_driver_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_metrics"("p_today" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_metrics"("p_today" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics"("p_today" "date") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_offer_by_id"("p_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_offer_by_id"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_offer_by_id"("p_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_reservation_by_id"("p_booking_id" "uuid", "p_driver_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_reservation_by_id"("p_booking_id" "uuid", "p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reservation_by_id"("p_booking_id" "uuid", "p_driver_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_route_price"("p_origin_id" "uuid", "p_destination_id" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_route_price"("p_origin_id" "uuid", "p_destination_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_route_price"("p_origin_id" "uuid", "p_destination_id" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_trips_for_payout"("p_driver_id" "uuid", "p_month_start" timestamp with time zone, "p_month_end" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_trips_for_payout"("p_driver_id" "uuid", "p_month_start" timestamp with time zone, "p_month_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trips_for_payout"("p_driver_id" "uuid", "p_month_start" timestamp with time zone, "p_month_end" timestamp with time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_unconfirmed_assignments"("p_threshold" timestamp with time zone) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_unconfirmed_assignments"("p_threshold" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unconfirmed_assignments"("p_threshold" timestamp with time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_unconfirmed_assignments_v2"("p_threshold" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_client_cancelled_data"("p_booking_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_client_cancelled_data"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_client_cancelled_data"("p_booking_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."notify_client_confirmed_data"("p_booking_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_client_confirmed_data"("p_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_client_confirmed_data"("p_booking_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."notify_driver_data"("p_driver_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."notify_driver_data"("p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_driver_data"("p_driver_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_booking_on_confirm"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_booking_on_confirm"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."accessories" TO "service_role";



GRANT ALL ON TABLE "public"."booking_assignments" TO "service_role";
GRANT SELECT ON TABLE "public"."booking_assignments" TO "authenticated";



GRANT ALL ON TABLE "public"."bookings" TO "service_role";
GRANT SELECT ON TABLE "public"."bookings" TO "authenticated";



GRANT ALL ON TABLE "public"."driver_availability" TO "service_role";



GRANT ALL ON TABLE "public"."driver_fixed_routes" TO "service_role";



GRANT ALL ON TABLE "public"."driver_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."driver_station_zones" TO "service_role";



GRANT ALL ON TABLE "public"."driver_stations" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."integration_settings" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."return_offers" TO "service_role";



GRANT ALL ON TABLE "public"."route_prices" TO "service_role";



GRANT ALL ON TABLE "public"."saved_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."station_exclusivities" TO "service_role";



GRANT ALL ON TABLE "public"."stations" TO "service_role";
GRANT SELECT ON TABLE "public"."stations" TO "anon";
GRANT SELECT ON TABLE "public"."stations" TO "authenticated";



GRANT ALL ON TABLE "public"."system_config" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_accessories" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































