-- ============================================================================
-- CORRIGE un fallo introducido en 20260831164302
--
-- APLICADA a hgnsvqhizbdwawkgjciw el 2026-08-31.
--
-- La rama de exclusividad por parada hacía:
--   SELECT d.id, v.id, v.plate INTO bloqueado, candidato.vehiculo_id, candidato.matricula
-- y `candidato` es un RECORD sin asignar en ese punto, así que Postgres aborta
-- con «record "candidato" is not assigned yet».
--
-- No era teórico: el Aeropuerto de Asturias TIENE exclusividad y es la parada
-- de origen más probable, así que cualquier reserva desde allí fallaba al
-- asignar. Lo detectó una llamada de comprobación, no la revisión del código —
-- un recordatorio de que reescribir una función y leerla no basta.
--
-- Se usan variables escalares propias en lugar de campos de un RECORD.
-- Verificado después: la rama de exclusividad devuelve conductor y matrícula, y
-- la del round-robin sigue funcionando.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_driver_for_assignment"("p_origin_station_id" "uuid", "p_destination_station_id" "uuid", "p_passengers" integer, "p_luggage_big" integer, "p_luggage_hand" integer, "p_needs_child_seat" boolean, "p_needs_pet_friendly" boolean, "p_needs_accessible" boolean, "p_needs_large_vehicle" boolean, "p_pickup_at" timestamp with time zone, "p_dest_lat" numeric DEFAULT NULL::numeric, "p_dest_lng" numeric DEFAULT NULL::numeric, "p_origin_lat" numeric DEFAULT NULL::numeric, "p_origin_lng" numeric DEFAULT NULL::numeric) RETURNS TABLE("id" "uuid", "last_assigned_at" timestamp with time zone, "vehicle_id" "uuid", "plate" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  station_ids      UUID[];
  pickup_local     TIMESTAMP;
  exclusive_driver UUID;
  candidato        RECORD;
  bloqueado        UUID;
  marca            TIMESTAMPTZ;
  -- Escalares propias para la rama de exclusividad: asignar a campos de un
  -- RECORD sin inicializar aborta la función.
  excl_vehiculo    UUID;
  excl_matricula   TEXT;
BEGIN
  station_ids := ARRAY[]::UUID[];
  IF p_origin_station_id IS NOT NULL THEN station_ids := array_append(station_ids, p_origin_station_id); END IF;
  IF p_destination_station_id IS NOT NULL THEN station_ids := array_append(station_ids, p_destination_station_id); END IF;
  pickup_local := p_pickup_at AT TIME ZONE 'Europe/Madrid';

  -- 1. Exclusividad por parada: decisión del admin, no entra en el reparto
  IF cardinality(station_ids) > 0 THEN
    SELECT se.driver_id INTO exclusive_driver FROM station_exclusivities se
    WHERE se.station_id = ANY(station_ids) LIMIT 1;

    IF exclusive_driver IS NOT NULL THEN
      SELECT d.id, v.id, v.plate
        INTO bloqueado, excl_vehiculo, excl_matricula
      FROM drivers d JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      WHERE d.id = exclusive_driver AND d.is_active = TRUE AND d.is_approved = TRUE
      ORDER BY v.created_at ASC LIMIT 1;

      IF bloqueado IS NOT NULL THEN
        marca := public.marcar_turno_conductor(bloqueado);
        RETURN QUERY SELECT bloqueado, marca, excl_vehiculo, excl_matricula;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 2. Round-robin entre miembros, recorriendo por antigüedad real
  FOR candidato IN
    SELECT elegibles.driver_id, elegibles.vehiculo_id, elegibles.matricula
    FROM (
      SELECT DISTINCT ON (d.id)
        d.id AS driver_id, d.last_assigned_at, v.id AS vehiculo_id, v.plate AS matricula
      FROM drivers d
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
      WHERE d.is_active = TRUE AND d.is_approved = TRUE AND d.is_member = TRUE
        AND (cardinality(station_ids) = 0 OR EXISTS (
          SELECT 1 FROM driver_stations ds WHERE ds.driver_id = d.id
            AND ds.is_active = TRUE AND ds.station_id = ANY(station_ids)))
        AND v.max_passengers >= p_passengers
        AND v.max_luggage_big >= p_luggage_big
        AND v.max_luggage_hand >= p_luggage_hand
        AND (p_needs_child_seat = FALSE OR v.has_child_seat = TRUE)
        AND (p_needs_pet_friendly = FALSE OR v.has_pet_friendly = TRUE)
        AND (p_needs_accessible = FALSE OR v.is_accessible = TRUE)
        AND (p_needs_large_vehicle = FALSE OR v.is_large_vehicle = TRUE)
        AND NOT EXISTS (
          SELECT 1 FROM booking_assignments ba JOIN bookings b ON b.id = ba.booking_id
          WHERE ba.driver_id = d.id AND b.status IN ('pending','confirmed')
            AND b.pickup_at BETWEEN (p_pickup_at - INTERVAL '3 hours') AND (p_pickup_at + INTERVAL '3 hours'))
        AND NOT EXISTS (
          SELECT 1 FROM driver_availability da WHERE da.driver_id = d.id
            AND da.date = pickup_local::date AND da.is_available = FALSE)
        AND NOT EXISTS (
          SELECT 1 FROM driver_station_zones z JOIN stations s ON s.id = z.station_id
          CROSS JOIN LATERAL (
            SELECT
              CASE WHEN p_origin_station_id = z.station_id THEN 0::double precision
                   WHEN p_origin_lat IS NOT NULL AND p_origin_lng IS NOT NULL
                     THEN haversine_km(s.lat, s.lng, p_origin_lat, p_origin_lng)
                   ELSE NULL END AS origin_dist,
              CASE WHEN p_dest_lat IS NOT NULL AND p_dest_lng IS NOT NULL
                     THEN haversine_km(s.lat, s.lng, p_dest_lat, p_dest_lng)
                   ELSE NULL END AS dest_dist
          ) dist
          WHERE z.driver_id = d.id AND z.mode = 'exclude'
            AND s.lat IS NOT NULL AND s.lng IS NOT NULL
            AND dist.origin_dist IS NOT NULL AND dist.dest_dist IS NOT NULL
            AND dist.origin_dist >= z.radius_from_km AND dist.origin_dist < z.radius_to_km
            AND dist.dest_dist >= z.radius_from_km AND dist.dest_dist < z.radius_to_km)
      -- DISTINCT ON exige empezar por d.id: el vehículo más antiguo desempata
      -- dentro del grupo del conductor.
      ORDER BY d.id, v.created_at ASC
    ) elegibles
    -- La ordenación por antigüedad va FUERA de la subconsulta. Estaba dentro, y
    -- eso hacía que d.id dominara: el reparto elegía siempre el UUID más bajo.
    ORDER BY elegibles.last_assigned_at ASC NULLS FIRST
  LOOP
    -- SKIP LOCKED: si otra reserva simultánea ya tiene cogido a este conductor,
    -- se pasa al siguiente en lugar de esperar o de duplicar la asignación.
    SELECT d.id INTO bloqueado FROM drivers d
    WHERE d.id = candidato.driver_id FOR UPDATE SKIP LOCKED;

    IF bloqueado IS NOT NULL THEN
      -- Marcar el turno DENTRO de la misma transacción que la selección es lo
      -- que impide que dos llamadas concurrentes elijan al mismo conductor.
      marca := public.marcar_turno_conductor(bloqueado);
      RETURN QUERY SELECT bloqueado, marca, candidato.vehiculo_id, candidato.matricula;
      RETURN;
    END IF;
  END LOOP;

  -- Sin candidatos libres. Quien llama lo distingue de un error.
  RETURN;
END;
$$;
