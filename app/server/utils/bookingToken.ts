import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token firmado (HMAC-SHA256) que da acceso de solo lectura a una reserva
 * concreta. Se envía por email a los invitados para que puedan volver a ver su
 * reserva sin tener cuenta.
 *
 * Dos cambios respecto a la versión anterior:
 *
 * 1. SECRETO PROPIO. Antes se firmaba con la service role key «para no exigir
 *    una variable de entorno extra». Eso mezclaba el secreto de firma con la
 *    credencial que salta el RLS: rotar una obligaba a invalidar los enlaces de
 *    la otra, y cualquier debilidad en el uso del HMAC tocaba la clave más
 *    sensible del sistema. Además, un `|| 'dev-secret'` convertía una variable
 *    ausente en tokens falsificables sin ruido.
 *
 * 2. CADUCIDAD. Antes el token no caducaba, así que un enlace reenviado o
 *    filtrado daba acceso permanente a los datos personales de la reserva:
 *    nombre, teléfono y direcciones de recogida y destino.
 *
 * Formato: `<vencimiento en segundos>.<firma>`. El vencimiento va en claro
 * porque está dentro del material firmado: alterarlo invalida la firma.
 */

/** Días que el enlace sigue siendo válido desde su emisión. */
const VALIDEZ_DIAS = 90

function getSecret(): string {
  const config = useRuntimeConfig()
  const secret = (config.bookingTokenSecret as string) || ''
  if (!secret) {
    // Fallar aquí es preferible a firmar con un secreto conocido: un token
    // falsificable da acceso a datos personales de terceros.
    throw createError({
      statusCode: 500,
      message: 'BOOKING_TOKEN_SECRET no está configurado',
    })
  }
  return secret
}

function sign(bookingId: string, expiresAt: number): string {
  return createHmac('sha256', getSecret())
    .update(`booking:${bookingId}:${expiresAt}`)
    .digest('hex')
    .slice(0, 32)
}

export function signBookingToken(bookingId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + VALIDEZ_DIAS * 24 * 60 * 60
  return `${expiresAt}.${sign(bookingId, expiresAt)}`
}

export function verifyBookingToken(bookingId: string, token?: string | null): boolean {
  if (!token) return false

  const [expiresRaw, signature] = String(token).split('.')
  if (!expiresRaw || !signature) return false

  const expiresAt = Number(expiresRaw)
  if (!Number.isInteger(expiresAt)) return false
  if (expiresAt < Math.floor(Date.now() / 1000)) return false

  const expected = sign(bookingId, expiresAt)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
