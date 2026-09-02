export async function getSystemConfig(): Promise<Record<string, unknown>> {
  const db = useDb()
  const { data: rows } = await db.from('system_config').select('key, value')
  const config: Record<string, unknown> = {}
  for (const row of (rows || []) as Array<Record<string, unknown>>) {
    config[row.key as string] = row.value
  }
  return config
}



/**
 * Precio estimado por distancia cuando no existe tarifa fija de ruta.
 * Usa base_fare + km × price_per_km de system_config.
 * Devuelve null si no se puede geocodificar el destino.
 *
 * Acepta las coordenadas ya resueltas porque quien llama —`quoteBooking`— las
 * ha calculado un momento antes. Sin eso, cada presupuesto geocodificaba la
 * misma dirección DOS veces: se veía en el registro, dos avisos idénticos
 * seguidos. Nominatim admite una petición por segundo, así que duplicarlas
 * acerca al límite, y pasado el límite el desenlace es el precio de último
 * recurso.
 */
export async function estimateDistancePrice(
  originStationId: string | null,
  destinationText: string,
  originAddress?: string,
  perKmOverride?: number | null,
  coordsConocidas?: {
    origin?: { lat: number, lng: number } | null
    destination?: { lat: number, lng: number } | null
    /** El destino ya se intentó geocodificar y no salió: no repetir la consulta. */
    noReintentarDestino?: boolean
  },
): Promise<{ price: number, distanceKm: number } | null> {
  const db = useDb()

  // Origen: las coordenadas ya conocidas, la parada, o el texto libre
  let origin: { lat: number, lng: number } | null = coordsConocidas?.origin ?? null
  if (!origin && originStationId) {
    const { data: station } = await db
      .from('stations')
      .select('lat, lng')
      .eq('id', originStationId)
      .single()
    const s = station as { lat: number | null, lng: number | null } | null
    if (s?.lat && s?.lng) origin = { lat: Number(s.lat), lng: Number(s.lng) }
  }
  if (!origin && originAddress) {
    origin = await geocodeAddress(originAddress)
  }
  if (!origin) return null

  let dest = coordsConocidas?.destination ?? null
  if (!dest) {
    if (coordsConocidas?.noReintentarDestino || !destinationText) return null
    dest = await geocodeAddress(destinationText)
  }
  if (!dest) return null

  const distanceKm = await getRouteDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng)

  const config = await getSystemConfig()
  const price = computeFare({
    baseFare: Number(config.base_fare ?? 4),
    // La tarifa propia del conductor asignado prevalece sobre la global
    perKm: perKmOverride && perKmOverride > 0 ? Number(perKmOverride) : Number(config.price_per_km ?? 1.2),
    minFare: Number(config.min_fare ?? 10),
    distanceKm,
  })

  return { price, distanceKm: Math.round(distanceKm * 10) / 10 }
}


/**
 * Cálculo puro de tarifa por distancia (testeado en tests/unit/pricing.spec.ts).
 * Redondea a 0,50 € para precios "limpios" y aplica tarifa mínima.
 */
export function computeFare(input: { baseFare: number, perKm: number, minFare: number, distanceKm: number }): number {
  const raw = input.baseFare + input.distanceKm * input.perKm
  return Math.max(input.minFare, Math.round(raw * 2) / 2)
}


// ─────────────────────────────────────────────────────────────────────────────
// Presupuesto de una reserva — FUENTE ÚNICA DE VERDAD
//
// Antes este cálculo vivía dentro de payments/create-intent.post.ts y
// bookings/index.post.ts se limitaba a guardar el precio que le enviaba el
// cliente, con lo que cualquiera podía reservar por el importe que quisiera.
// Ahora las dos rutas llaman aquí y el precio del cliente se ignora.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suplementos por extras y precio de último recurso, por defecto.
 *
 * Se leen de system_config, editable desde el panel: estaban incrustados en el
 * código, así que cambiar el suplemento de la silla infantil exigía un
 * despliegue. Estos valores solo actúan si la clave no está en la tabla.
 */
export const BOOKING_EXTRAS_DEFECTO = {
  childSeat: 5,
  petFriendly: 3,
  largeVehicle: 8,
} as const

/** Precio de último recurso si no hay tarifa fija ni estimación por distancia. */
export const FALLBACK_FARE_DEFECTO = 25

/** Tope de descuento de una oferta de retorno, si la clave no está en la tabla. */
export const MAX_DESCUENTO_OFERTA_DEFECTO = 40

/** Lee un número de la configuración, con valor por defecto si falta o no es válido. */
function numeroDeConfig(config: Record<string, unknown>, clave: string, defecto: number): number {
  const valor = Number(config[clave])
  return Number.isFinite(valor) && valor >= 0 ? valor : defecto
}

/**
 * Valida el descuento de una oferta de retorno contra el tope configurado.
 *
 * El tope existía en tres sitios y ninguno era el que hacía falta: el deslizador
 * del formulario lo limitaba a 40, la ruta de EDICIÓN lo comprobaba con un 40
 * escrito a mano, y `system_config.max_return_offer_discount_pct` lo guardaba
 * sin que nadie lo leyera. La ruta de CREACIÓN no lo comprobaba en absoluto:
 * su esquema acepta `porcentaje`, que es 0–100.
 *
 * Un taxista podía publicar una oferta al 100 % de descuento —precio final 0 €—
 * saltándose el deslizador con una petición directa. Y como la comisión del club
 * se calcula sobre el importe del viaje, un viaje de 0 € no devenga comisión:
 * cobrando en mano y publicando al 100 %, el taxista no le debe nada a la
 * plataforma.
 */
export async function assertDescuentoOfertaPermitido(descuento: number): Promise<number> {
  const config = await getSystemConfig()
  const tope = numeroDeConfig(config, 'max_return_offer_discount_pct', MAX_DESCUENTO_OFERTA_DEFECTO)

  if (!descuentoOfertaValido(descuento, tope)) {
    throw createError({
      statusCode: 400,
      message: `El descuento debe estar entre 0 y ${tope} %`,
    })
  }
  return descuento
}

/**
 * La regla, aparte de la lectura de configuración, para poder probarla.
 *
 * Exige entero además de rango: `return_offers.discount_pct` es una columna
 * `integer`, así que un 40,5 llegaba a Postgres y volvía como
 * «invalid input syntax for type integer: "40.5"» en un 500, con el error de la
 * base de datos en crudo hacia el cliente. Ahora es un 400 con un mensaje que
 * dice qué se esperaba.
 */
export function descuentoOfertaValido(descuento: number, tope: number): boolean {
  return Number.isInteger(descuento) && descuento >= 0 && descuento <= tope
}

export interface BookingQuoteInput {
  originStationId?: string | null
  originAddress?: string | null
  /** Destino en texto libre. */
  destination?: string | null
  destinationStationId?: string | null
  accessoryIds?: string[]
  needsChildSeat?: boolean
  needsPetFriendly?: boolean
  needsAccessible?: boolean
  needsLargeVehicle?: boolean
  passengers?: number
  luggageBig?: number
  luggageHand?: number
  /** Permite usar la tarifa del conductor que recibiría la reserva. */
  pickupAt?: string | null
  /** Coordenadas ya conocidas: evita volver a geocodificar. */
  originLat?: number | null
  originLng?: number | null
  destinationLat?: number | null
  destinationLng?: number | null
}

export interface BookingQuote {
  basePrice: number
  extras: number
  totalPrice: number
  needsChildSeat: boolean
  needsPetFriendly: boolean
  needsAccessible: boolean
  needsLargeVehicle: boolean
  /** Coordenadas resueltas, para que quien llame no geocodifique otra vez. */
  originCoords: { lat: number, lng: number } | null
  destinationCoords: { lat: number, lng: number } | null
  /** De dónde sale basePrice, útil para diagnóstico y para el panel. */
  source: 'driver_fixed_route' | 'route_price' | 'distance_estimate' | 'fallback'
}

/** Tarifa fija de ruta del admin, si el origen es una parada registrada. */
async function fixedRoutePrice(originId: string, destinationId: string): Promise<number | null> {
  const { data: prices } = await callRpc<Array<{ base_price: number | null }>>('get_route_price', {
    p_origin_id: originId,
    p_destination_id: destinationId,
  })
  const first = prices?.[0]
  if (first && first.base_price !== null) {
    return Number(first.base_price)
  }
  return null
}

/**
 * Calcula el precio autoritativo de una reserva. Nunca acepta un importe del
 * cliente: todo se deriva del origen, el destino y la configuración.
 */
export async function quoteBooking(input: BookingQuoteInput): Promise<BookingQuote> {
  // La configuración y los accesorios son dos consultas a Supabase que no
  // dependen la una de la otra, y se esperaban en serie en la ruta más
  // sensible de la aplicación.
  const [config, flags] = await Promise.all([
    getSystemConfig(),
    resolveAccessoryFlags(input.accessoryIds),
  ])

  // 1. Extras: acepta flags directos o IDs de accesorios
  const needsChildSeat = Boolean(input.needsChildSeat) || flags.needsChildSeat
  const needsPetFriendly = Boolean(input.needsPetFriendly) || flags.needsPetFriendly
  const needsAccessible = Boolean(input.needsAccessible) || flags.needsAccessible
  const needsLargeVehicle = Boolean(input.needsLargeVehicle) || flags.needsLargeVehicle

  // 2. Coordenadas (reutiliza las recibidas; geocodifica solo si faltan)
  //
  // Las dos geocodificaciones —origen y destino— son independientes, y la
  // auditoría proponía lanzarlas con Promise.all. NO se hace, a propósito:
  // Nominatim admite UNA petición por segundo, y pasarse devuelve 429. Como el
  // fallo de geocodificación acaba en el precio de último recurso, paralelizar
  // aquí cambiaría un poco de latencia por cobrar de menos de vez en cuando.
  // En serie, además, casi siempre solo hay una: el buscador manda ya las
  // coordenadas del destino.
  //
  // Se guarda si ya se INTENTÓ geocodificar, no solo el resultado: cuando el
  // intento falla, `destinationCoords` queda a null y el cálculo por distancia
  // volvía a geocodificar la misma dirección un instante después. Se veía en el
  // registro en cuanto se dejó de tragar el fallo: dos avisos idénticos
  // seguidos, y con Nominatim limitado a una petición por segundo, la mitad de
  // las peticiones gastadas en repetir algo que ya se sabía que no resuelve.
  let destinationCoords: { lat: number, lng: number } | null =
    input.destinationLat != null && input.destinationLng != null
      ? { lat: input.destinationLat, lng: input.destinationLng }
      : null
  let destinoYaIntentado = destinationCoords != null
  if (!destinationCoords && input.destination) {
    destinoYaIntentado = true
    try {
      destinationCoords = await geocodeAddress(input.destination)
    } catch (e) {
      console.error('[Pricing] Geocodificación del destino falló:', (e as Error)?.message)
    }
  }

  let originCoords: { lat: number, lng: number } | null =
    input.originLat != null && input.originLng != null
      ? { lat: input.originLat, lng: input.originLng }
      : null
  if (!originCoords && !input.originStationId && input.originAddress) {
    try {
      originCoords = await geocodeAddress(input.originAddress)
    } catch (e) {
      console.error('[Pricing] Geocodificación del origen falló:', (e as Error)?.message)
    }
  }

  // 3. Tarifa del conductor que recibiría la reserva: su €/km y sus anillos de
  //    precio fijo prevalecen sobre lo global.
  let driverPerKm: number | null = null
  let driverFixedPrice: number | null = null
  if (input.pickupAt) {
    try {
      const peek = await peekAssignedDriverRate({
        originStationId: input.originStationId ?? undefined,
        destinationStationId: input.destinationStationId ?? undefined,
        passengers: input.passengers,
        luggageBig: input.luggageBig,
        luggageHand: input.luggageHand,
        needsChildSeat,
        needsPetFriendly,
        needsAccessible,
        needsLargeVehicle,
        pickupAt: input.pickupAt,
        destLat: destinationCoords?.lat ?? null,
        destLng: destinationCoords?.lng ?? null,
        originLat: originCoords?.lat ?? null,
        originLng: originCoords?.lng ?? null,
      })
      driverPerKm = peek?.perKm ?? null
      driverFixedPrice = peek?.fixedPrice ?? null
    } catch (e) {
      console.error('[Pricing] peekAssignedDriverRate falló:', (e as Error)?.message)
    }
  }

  // 4. Precio base, en orden de prioridad
  let basePrice: number
  let source: BookingQuote['source']

  if (driverFixedPrice != null) {
    basePrice = driverFixedPrice
    source = 'driver_fixed_route'
  } else {
    const destinationKey = input.destinationStationId || input.destination || ''
    const routePrice = input.originStationId
      ? await fixedRoutePrice(input.originStationId, destinationKey)
      : null

    if (routePrice != null) {
      basePrice = routePrice
      source = 'route_price'
    } else {
      let estimated: number | null = null
      try {
        const estimate = await estimateDistancePrice(
          input.originStationId ?? null,
          destinationKey,
          input.originAddress ?? undefined,
          driverPerKm,
          // Las coordenadas resueltas en el paso 2, para no geocodificar dos
          // veces la misma dirección dentro de un mismo presupuesto
          {
            origin: originCoords,
            destination: destinationCoords,
            noReintentarDestino: destinoYaIntentado,
          },
        )
        estimated = estimate?.price ?? null
      } catch (e) {
        console.error('[Pricing] Estimación por distancia falló:', (e as Error)?.message)
      }
      if (estimated != null) {
        basePrice = estimated
        source = 'distance_estimate'
      } else {
        basePrice = numeroDeConfig(config, 'fallback_fare', FALLBACK_FARE_DEFECTO)
        source = 'fallback'
        // Este es el precio de «no sé cuánto cuesta este viaje», y es el que se
        // cobra. Merece un aviso con las direcciones: era el desenlace real de
        // cualquier destino que Nominatim no reconociera, y pasaba callado.
        console.warn(
          `[Pricing] Sin distancia ni tarifa: se cobra el precio de último recurso `
          + `(${basePrice} €). origen=«${input.originStationId || input.originAddress || '?'}» `
          + `destino=«${input.destination || input.destinationStationId || '?'}»`,
        )
      }
    }
  }

  // 5. Extras y total
  let extras = 0
  if (needsChildSeat) extras += numeroDeConfig(config, 'extra_child_seat', BOOKING_EXTRAS_DEFECTO.childSeat)
  if (needsPetFriendly) extras += numeroDeConfig(config, 'extra_pet_friendly', BOOKING_EXTRAS_DEFECTO.petFriendly)
  if (needsLargeVehicle) extras += numeroDeConfig(config, 'extra_large_vehicle', BOOKING_EXTRAS_DEFECTO.largeVehicle)

  const totalPrice = Math.round((basePrice + extras) * 100) / 100

  return {
    basePrice,
    extras,
    totalPrice,
    needsChildSeat,
    needsPetFriendly,
    needsAccessible,
    needsLargeVehicle,
    originCoords,
    destinationCoords,
    source,
  }
}

/**
 * Antelación mínima exigida por la configuración. Se valida en servidor: el
 * formulario también la respeta, pero eso no impide llamar a la API a mano.
 */
export async function assertPickupWithinPolicy(pickupAt: unknown): Promise<Date> {
  if (typeof pickupAt !== 'string' || !pickupAt) {
    throw createError({ statusCode: 400, message: 'Falta la fecha y hora de recogida' })
  }
  const pickup = new Date(pickupAt)
  if (Number.isNaN(pickup.getTime())) {
    throw createError({ statusCode: 400, message: 'La fecha y hora de recogida no es válida' })
  }

  const config = await getSystemConfig()
  const minAdvanceHours = Number(config.min_advance_hours ?? 12)
  const earliest = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000)

  if (pickup < earliest) {
    throw createError({
      statusCode: 400,
      message: `Las reservas necesitan al menos ${minAdvanceHours} h de antelación. La recogida más próxima disponible es el ${earliest.toLocaleString('es-ES')}.`,
    })
  }
  return pickup
}
