-- Reservas cuyo precio se calculó sin poder situar el destino en el mapa.
--
-- Cuando Nominatim no reconoce una dirección devuelve una lista vacía, y
-- geocodeAddress() devolvía null sin registrar nada: la reserva se guardaba sin
-- coordenadas y el precio caía al de último recurso. Comprobado contra el
-- servicio real: «Estación de RENFE, Oviedo» y «Calle Uría, Pravia» devuelven
-- las dos [], y el primer trayecto se cotizaba a 25 € cuando el conductor tiene
-- una tarifa fija de 45 € para él exactamente.
--
-- Sin coordenadas se pierden además la asignación por anillos del conductor y
-- las rutas fijas por proximidad, así que estas reservas están degradadas en
-- precio Y en reparto. La vista existe para poder contarlas y revisarlas, que
-- es lo que no se podía hacer: al crearla había 10 reservas afectadas, 4 de
-- ellas cobradas al precio de último recurso.
CREATE OR REPLACE VIEW public.bookings_sin_geocodificar AS
SELECT
  b.id,
  b.created_at,
  b.pickup_at,
  b.status,
  b.origin_address,
  b.destination_address,
  b.destination_station_id,
  b.base_price,
  b.total_price,
  CASE
    WHEN b.destination_lat IS NULL AND b.origin_lat IS NULL THEN 'origen y destino'
    WHEN b.destination_lat IS NULL THEN 'destino'
    ELSE 'origen'
  END AS falta,
  -- Una reserva atada a una parada no necesitaba geocodificarse para tener
  -- tarifa: se distingue para no confundir los dos casos al revisar.
  (b.destination_station_id IS NOT NULL) AS tenia_parada
FROM public.bookings b
WHERE b.destination_lat IS NULL OR b.origin_lat IS NULL
ORDER BY b.created_at DESC;

COMMENT ON VIEW public.bookings_sin_geocodificar IS
  'Reservas guardadas sin coordenadas: precio y asignación degradados. Ver services/pricing.ts → geocodeAddress().';

-- La vista solo la consulta el servidor con la clave de servicio: contiene
-- direcciones de clientes y no tiene por qué llegar al navegador.
REVOKE ALL ON public.bookings_sin_geocodificar FROM anon, authenticated;
