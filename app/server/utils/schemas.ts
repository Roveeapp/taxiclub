import { z } from 'zod'

/**
 * Mensajes en castellano para los errores genéricos de Zod. Sin esto, la API
 * responde mezclando idiomas: el nombre del campo en castellano y el motivo en
 * inglés ("Required", "Expected array, received string").
 */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'es obligatorio' }
      return { message: `se esperaba ${traducirTipo(issue.expected)} y llegó ${traducirTipo(issue.received)}` }
    case z.ZodIssueCode.too_small:
      if (issue.type === 'array') return { message: `necesita al menos ${issue.minimum} elementos` }
      if (issue.type === 'string') return { message: `necesita al menos ${issue.minimum} caracteres` }
      return { message: `no puede ser menor que ${issue.minimum}` }
    case z.ZodIssueCode.too_big:
      if (issue.type === 'array') return { message: `no puede pasar de ${issue.maximum} elementos` }
      if (issue.type === 'string') return { message: `no puede pasar de ${issue.maximum} caracteres` }
      return { message: `no puede ser mayor que ${issue.maximum}` }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `tiene que ser uno de: ${issue.options.join(', ')}` }
    case z.ZodIssueCode.not_multiple_of:
      return { message: `tiene que ser múltiplo de ${issue.multipleOf}` }
    default:
      return { message: ctx.defaultError }
  }
})

function traducirTipo(tipo: unknown): string {
  const tipos: Record<string, string> = {
    string: 'texto', number: 'número', boolean: 'sí/no', array: 'una lista',
    object: 'un objeto', undefined: 'nada', null: 'nulo', nan: 'un número',
    integer: 'un número entero', date: 'una fecha',
  }
  return tipos[String(tipo)] || String(tipo)
}

/**
 * Esquemas de entrada de la API.
 *
 * Se derivan de los campos que cada ruta lee realmente de su cuerpo, no de lo
 * que parecería razonable: un esquema más estricto que el uso real rompe la
 * aplicación en silencio. Todos usan `.strip()` implícito de Zod (los campos
 * desconocidos se descartan) en lugar de `.strict()`, para que el cliente pueda
 * seguir enviando campos que el servidor ya no usa —como `basePrice` y
 * `totalPrice`, que ahora se ignoran a propósito— sin recibir un error.
 */

// ── Piezas reutilizables ─────────────────────────────────────────────────────

export const uuid = z.string().uuid('debe ser un identificador válido')
export const isoDate = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?/, 'debe ser una fecha válida'),
)
export const texto = (max: number) => z.string().trim().min(1, 'no puede estar vacío').max(max, `no puede pasar de ${max} caracteres`)
export const email = z.string().trim().email('no parece un correo válido').max(254)
/** Teléfono permisivo: se recogen formatos internacionales muy variados. */
export const telefono = z.string().trim().min(6, 'demasiado corto').max(32)
export const eurosPositivos = z.number().nonnegative('no puede ser negativo').max(10_000, 'importe fuera de rango')
export const latitud = z.number().min(-90).max(90)
export const longitud = z.number().min(-180).max(180)
export const porcentaje = z.number().min(0, 'no puede ser negativo').max(100, 'no puede pasar de 100')

/** Contraseña: el mínimo de Supabase Auth es 6, no imponemos más aquí. */
export const password = z.string().min(6, 'necesita al menos 6 caracteres').max(200)

/**
 * Número opcional que además admite la cadena vacía como «borrar el valor».
 *
 * Los formularios del panel envían '' cuando se vacía un campo numérico, y las
 * rutas lo interpretaban como null para volver al valor global. Al tipar esos
 * campos como número puro, vaciar un campo pasaba a devolver 400 en lugar de
 * limpiarlo — una regresión que este ayudante evita normalizando '' a null.
 */
export function numeroBorrable(
  schema: z.ZodNumber,
): z.ZodType<number | null | undefined, z.ZodTypeDef, unknown> {
  // El tipo de retorno se declara a mano a propósito. Ni z.union ni
  // z.preprocess propagan bien el tipo de salida a través de ZodType<T>: con la
  // unión salía `string | number`, y con preprocess salía `{}`. Declararlo hace
  // que readValidated infiera exactamente `number | null | undefined`.
  return z.preprocess(
    v => (v === '' ? null : v),
    schema.nullable().optional(),
  ) as z.ZodType<number | null | undefined, z.ZodTypeDef, unknown>
}

// ── Reservas ─────────────────────────────────────────────────────────────────

export const crearReservaSchema = z.object({
  originStationId: uuid.optional(),
  originAddress: z.string().trim().max(300).optional(),
  originLat: latitud.nullish(),
  originLng: longitud.nullish(),
  destinationAddress: texto(300),
  destinationStationId: uuid.optional(),
  destinationLat: latitud.nullish(),
  destinationLng: longitud.nullish(),
  pickupAt: isoDate,
  passengers: z.number().int('debe ser un número entero').min(1).max(8).optional(),
  luggageBig: z.number().int().min(0).max(20).optional(),
  luggageHand: z.number().int().min(0).max(20).optional(),
  accessoryIds: z.array(uuid).max(20).optional(),
  needsChildSeat: z.boolean().optional(),
  needsPetFriendly: z.boolean().optional(),
  needsAccessible: z.boolean().optional(),
  needsLargeVehicle: z.boolean().optional(),
  guestName: z.string().trim().min(1).max(120).optional(),
  guestEmail: email.optional(),
  guestPhone: telefono.optional(),
  stripePaymentIntentId: z.string().trim().max(120).optional(),
  // El servidor calcula el precio; se aceptan sin usarlos para no romper a los
  // clientes que aún los envían.
  basePrice: z.unknown().optional(),
  totalPrice: z.unknown().optional(),
}).refine(d => Boolean(d.originStationId || d.originAddress), {
  message: 'hace falta indicar el origen, como parada o como dirección',
  path: ['originStationId'],
})

export const presupuestoSchema = z.object({
  originStationId: uuid.optional(),
  originAddress: z.string().trim().max(300).optional(),
  originLat: latitud.nullish(),
  originLng: longitud.nullish(),
  destination: z.string().trim().max(300).optional(),
  destinationStationId: uuid.optional(),
  // El buscador ya tiene estas coordenadas del autocompletado y las tiraba.
  // Son la señal fiable para saber si el destino es una parada registrada.
  destinationLat: latitud.nullish(),
  destinationLng: longitud.nullish(),
  passengers: z.number().int().min(1).max(8).optional(),
  luggageBig: z.number().int().min(0).max(20).optional(),
  luggageHand: z.number().int().min(0).max(20).optional(),
  accessoryIds: z.array(uuid).max(20).optional(),
  needsChildSeat: z.boolean().optional(),
  needsPetFriendly: z.boolean().optional(),
  needsAccessible: z.boolean().optional(),
  needsLargeVehicle: z.boolean().optional(),
  pickupAt: isoDate.optional(),
  createIntent: z.boolean().optional(),
}).refine(d => Boolean(d.originStationId || d.originAddress), {
  message: 'hace falta indicar el origen, como parada o como dirección',
  path: ['originStationId'],
})

export const reservarOfertaSchema = z.object({
  destinationName: z.string().trim().max(300).optional(),
  passengers: z.number().int().min(1).max(8).optional(),
  guestName: z.string().trim().min(1).max(120).optional(),
  guestEmail: email.optional(),
  guestPhone: telefono.optional(),
  stripePaymentIntentId: z.string().trim().max(120).optional(),
})

// ── Cuentas ──────────────────────────────────────────────────────────────────

export const registroSchema = z.object({
  email,
  password,
  fullName: z.string().trim().max(120).optional(),
  role: z.enum(['client', 'driver'], {
    errorMap: () => ({ message: 'solo se puede registrar como cliente o taxista' }),
  }).optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseCity: z.string().trim().max(80).optional(),
})

export const recuperarPasswordSchema = z.object({
  email,
  password: password.optional(),
})

// ── Cliente ──────────────────────────────────────────────────────────────────

export const direccionGuardadaSchema = z.object({
  label: texto(60),
  address: texto(300),
  lat: latitud.nullish(),
  lng: longitud.nullish(),
  is_favorite: z.boolean().optional(),
})

export const editarDireccionSchema = z.object({
  label: texto(60).optional(),
  is_favorite: z.boolean().optional(),
})

export const suscripcionPushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('el endpoint no es una URL válida'),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }).passthrough(),
  }).passthrough(),
})

export const errorClienteSchema = z.object({
  message: z.string().max(500),
  stack: z.string().max(2000).optional(),
  url: z.string().max(300).optional(),
})

// ── Taxista ──────────────────────────────────────────────────────────────────

const vehiculoBase = {
  plate: texto(15),
  brand: z.string().trim().max(40).optional(),
  model: z.string().trim().max(40).optional(),
  color: z.string().trim().max(30).optional(),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 2).optional(),
  maxPassengers: z.number().int().min(1).max(9).optional(),
  maxLuggageBig: z.number().int().min(0).max(20).optional(),
  maxLuggageHand: z.number().int().min(0).max(20).optional(),
  hasChildSeat: z.boolean().optional(),
  hasPetFriendly: z.boolean().optional(),
  isAccessible: z.boolean().optional(),
  isLargeVehicle: z.boolean().optional(),
  accessoryIds: z.array(uuid).max(30).optional(),
}

export const crearVehiculoSchema = z.object(vehiculoBase)
export const editarVehiculoSchema = z.object(vehiculoBase).partial()

export const perfilTaxistaSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: telefono.optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseCity: z.string().trim().max(80).optional(),
})

export const tarifaSchema = z.object({
  // Admite '' y null: vaciar el campo devuelve al conductor a la tarifa global
  pricePerKm: numeroBorrable(z.number().positive('tiene que ser mayor que cero').max(100, 'parece demasiado alta')),
})

const ofertaBase = {
  originAddress: z.string().trim().max(300).optional(),
  originLat: latitud.nullish(),
  originLng: longitud.nullish(),
  originBookingId: uuid.nullish(),
  destinationStationId: uuid,
  availableFrom: isoDate,
  availableUntil: isoDate,
  maxPassengers: z.number().int().min(1).max(9).optional(),
  discountPct: porcentaje.optional(),
}

export const crearOfertaSchema = z.object(ofertaBase).refine(
  d => new Date(d.availableUntil) > new Date(d.availableFrom),
  { message: 'la oferta no puede terminar antes de empezar', path: ['availableUntil'] },
)
export const editarOfertaSchema = z.object(ofertaBase).partial()

export const confirmarReservaSchema = z.object({
  plate: texto(15),
  phone: telefono,
  hasSub: z.boolean().optional(),
  subPlate: z.string().trim().max(15).optional(),
  subPhone: z.string().trim().max(32).optional(),
})

export const disponibilidadSchema = z.object({
  date: isoDate.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  // Formato antiguo, aún soportado: una sola franja como HH:MM
  hourFrom: z.string().regex(/^\d{2}:\d{2}$/, 'usa el formato HH:MM').nullish(),
  hourTo: z.string().regex(/^\d{2}:\d{2}$/, 'usa el formato HH:MM').nullish(),
  isAvailable: z.boolean().optional(),
  /**
   * Franjas horarias en formato HH:MM, que es lo que envía
   * AvailabilityCalendar.vue: `{ from: '09:00', to: '15:00' }`. El primer
   * esquema que escribí las declaró como { hourFrom, hourTo } numéricos, lo que
   * habría rechazado el cuerpo real y roto la disponibilidad.
   */
  timeSlots: z.array(z.object({
    from: z.string().regex(/^\d{2}:\d{2}$/, 'usa el formato HH:MM'),
    to: z.string().regex(/^\d{2}:\d{2}$/, 'usa el formato HH:MM'),
  })).max(6, 'como máximo 6 franjas por día').optional(),
}).refine(d => Boolean(d.date || (d.dateFrom && d.dateTo)), {
  message: 'hace falta una fecha, o un rango con inicio y fin',
  path: ['date'],
})

export const zonaSchema = z.object({
  stationId: uuid,
  mode: z.enum(['exclude', 'fixed_price'], {
    errorMap: () => ({ message: 'el modo tiene que ser exclude o fixed_price' }),
  }),
  fromKm: numeroBorrable(z.number().nonnegative().max(1000)),
  toKm: numeroBorrable(z.number().nonnegative().max(1000)),
  fixedPrice: numeroBorrable(eurosPositivos),
}).refine(d => d.mode !== 'fixed_price' || (d.fixedPrice != null && d.fixedPrice > 0), {
  message: 'con modo fixed_price hace falta un precio mayor que cero',
  path: ['fixedPrice'],
})

export const rutaFijaSchema = z.object({
  originStationId: uuid.nullish(),
  originLabel: z.string().trim().max(200).optional(),
  originLat: latitud.nullish(),
  originLng: longitud.nullish(),
  destStationId: uuid.nullish(),
  destLabel: z.string().trim().max(200).optional(),
  destLat: latitud.nullish(),
  destLng: longitud.nullish(),
  price: eurosPositivos,
})

// ── Administración ───────────────────────────────────────────────────────────

export const crearAccesorioSchema = z.object({
  name: texto(60),
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(60).optional(),
})

export const editarAccesorioSchema = z.object({
  name: texto(60).optional(),
  description: z.string().trim().max(300).nullish(),
  icon: z.string().trim().max(60).nullish(),
  isActive: z.boolean().optional(),
})

const paradaBase = {
  name: texto(80),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(300).optional(),
  lat: latitud.nullish(),
  lng: longitud.nullish(),
}

export const crearParadaSchema = z.object(paradaBase)
export const editarParadaSchema = z.object({
  ...paradaBase,
  isActive: z.boolean().optional(),
  exclusiveDriverId: uuid.nullish(),
}).partial()

export const crearConductorSchema = z.object({
  email,
  password: password.optional(),
  fullName: texto(120),
  phone: telefono.optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseCity: z.string().trim().max(80).optional(),
  isMember: z.boolean().optional(),
})

export const editarConductorSchema = z.object({
  email: email.optional(),
  password: password.optional(),
  isMember: z.boolean().optional(),
  isExempt: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  customMonthlyFee: numeroBorrable(eurosPositivos),
  customCommissionPct: numeroBorrable(porcentaje),
})

export const asignarReservaSchema = z.object({ driverId: uuid })

export const cancelarReservaSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const pagoReservaSchema = z.object({
  action: z.enum(['capture', 'cancel', 'refund'], {
    errorMap: () => ({ message: 'la acción tiene que ser capture, cancel o refund' }),
  }),
})

// ── Configuración del sistema ────────────────────────────────────────────────

/**
 * Claves admitidas en system_config. La ruta hacía un upsert de
 * `Object.entries(body)` sin filtrar, así que se podían inyectar claves
 * arbitrarias en la tabla de configuración. Se restringe a las que el código
 * lee de verdad; añadir una nueva pasa por añadirla aquí.
 */
export const CLAVES_CONFIG = [
  'base_fare',
  'price_per_km',
  'min_fare',
  'min_advance_hours',
  'max_cancel_hours_before',
  'service_window_hours',
  'commission_member_pct',
  'commission_non_member_pct',
  'membership_monthly_fee',
  'max_return_offer_discount_pct',
] as const

export const configuracionSchema = z
  .record(z.enum(CLAVES_CONFIG), z.union([z.string().max(60), z.number(), z.boolean()]))
  .refine(d => Object.keys(d).length > 0, { message: 'no hay nada que guardar' })

/** Claves de integraciones; los valores son secretos, solo se limita el tamaño. */
export const integracionesSchema = z
  .record(z.string().max(60), z.union([z.string().max(500), z.null()]))
  .refine(d => Object.keys(d).length > 0, { message: 'no hay nada que guardar' })

// ── Cobros de liquidaciones ──────────────────────────────────────────────────

/**
 * Un movimiento del libro de cobros. El importe puede ser negativo: así una
 * corrección o una devolución se registra con un asiento nuevo en lugar de
 * borrando historial.
 */
export const registrarCobroSchema = z.object({
  amount: z.number()
    .refine(v => v !== 0, { message: 'no puede ser cero' })
    .refine(v => Math.abs(v) <= 100_000, { message: 'importe fuera de rango' }),
  method: z.enum(['transfer', 'stripe', 'cash', 'adjustment'], {
    errorMap: () => ({ message: 'el método tiene que ser transfer, stripe, cash o adjustment' }),
  }),
  reference: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(500).nullish(),
  settledAt: isoDate.optional(),
})
