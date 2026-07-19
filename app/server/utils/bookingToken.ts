import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token firmado (HMAC-SHA256) que da acceso de solo lectura a una reserva
 * concreta. Se envía por email a los invitados para que puedan volver a
 * ver su reserva sin cuenta. No caduca (la reserva es efímera por sí misma).
 */
function getSecret(): string {
  const config = useRuntimeConfig()
  // Reutilizamos la service role key como secreto de firma para no exigir
  // una variable de entorno extra. Solo se usa server-side.
  return (config.supabaseServiceRoleKey as string) || 'dev-secret'
}

export function signBookingToken(bookingId: string): string {
  return createHmac('sha256', getSecret()).update(`booking:${bookingId}`).digest('hex').slice(0, 32)
}

export function verifyBookingToken(bookingId: string, token?: string | null): boolean {
  if (!token) return false
  const expected = signBookingToken(bookingId)
  const a = Buffer.from(expected)
  const b = Buffer.from(String(token))
  return a.length === b.length && timingSafeEqual(a, b)
}
