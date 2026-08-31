/**
 * Límite de peticiones por IP para las rutas públicas.
 *
 * Cinco rutas respondían sin autenticación y sin límite alguno, dos de ellas
 * con coste económico directo: /api/payments/create-intent crea PaymentIntents
 * reales en Stripe, y /api/bookings dispara un correo por reserva.
 *
 * Los límites están calibrados sobre el uso real del cliente, no a ojo:
 *   · addresses/search lo llama el autocompletado mientras se escribe
 *   · create-intent se usa también para presupuestar, no solo para pagar
 *   · bookings y register los ejecuta una persona un par de veces
 *
 * DÓNDE VIVE EL CONTADOR: en useStorage('cache') de Nitro, cuyo driver depende
 * del entorno. En desarrollo es el sistema de ficheros (.nuxt/cache/ratelimit/,
 * comprobado), así que sobrevive a los reinicios. En producción depende del
 * preset de despliegue, y ahí está la limitación: si son varias instancias sin
 * almacenamiento compartido, cada una lleva su propia cuenta y el límite
 * efectivo se multiplica por el número de instancias. Para que sea exacto hay
 * que configurar un driver compartido (KV, Redis) en nitro.storage. Aun así,
 * esto ya corta el abuso sostenido desde una IP.
 */

export interface RateLimitRule {
  /** Nombre del cubo, para que rutas distintas no compartan contador. */
  bucket: string
  /** Peticiones permitidas dentro de la ventana. */
  limit: number
  windowSeconds: number
}

const HORA = 3600

/**
 * Regla aplicable a una petición, o null si la ruta no se limita.
 * Función pura: se testea en tests/unit/rate-limit.spec.ts.
 */
export function rateLimitRuleForRequest(method: string, path: string): RateLimitRule | null {
  const m = method.toUpperCase()
  // Quitamos la query para que ?q=... no cree cubos distintos
  const p = path.split('?')[0] ?? ''

  if (m === 'POST' && p === '/api/bookings') {
    // Una persona reserva una o dos veces; 5 deja margen para reintentos
    return { bucket: 'bookings', limit: 5, windowSeconds: HORA }
  }
  if (m === 'POST' && p === '/api/auth/register') {
    return { bucket: 'register', limit: 5, windowSeconds: HORA }
  }
  if (m === 'POST' && p === '/api/payments/create-intent') {
    // Se usa para presupuestar en cada cambio del formulario, no solo al pagar
    return { bucket: 'create-intent', limit: 60, windowSeconds: HORA }
  }
  if (m === 'POST' && p === '/api/log-error') {
    return { bucket: 'log-error', limit: 30, windowSeconds: HORA }
  }
  if (m === 'GET' && p === '/api/addresses/search') {
    // El autocompletado dispara mientras se escribe; generoso a propósito
    return { bucket: 'addresses', limit: 120, windowSeconds: HORA }
  }
  // Reservar una oferta de última hora: sin autenticar y con pago detrás
  if (m === 'POST' && /^\/api\/ofertas\/[^/]+\/(reservar|intent)$/.test(p)) {
    return { bucket: 'ofertas', limit: 10, windowSeconds: HORA }
  }
  return null
}

/** Clave del contador: cubo + IP + ventana temporal (ventana fija). */
export function rateLimitKey(rule: RateLimitRule, ip: string, nowMs: number): string {
  const window = Math.floor(nowMs / (rule.windowSeconds * 1000))
  return `ratelimit:${rule.bucket}:${ip}:${window}`
}

/** Segundos que faltan para que se abra la siguiente ventana. */
export function secondsUntilReset(rule: RateLimitRule, nowMs: number): number {
  const windowMs = rule.windowSeconds * 1000
  return Math.ceil((windowMs - (nowMs % windowMs)) / 1000)
}
