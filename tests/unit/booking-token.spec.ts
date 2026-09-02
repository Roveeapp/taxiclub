import {describe, it, expect, vi, afterEach} from 'vitest'

// El módulo usa los auto-imports de Nitro; los declaramos antes de importarlo.
const g = globalThis as Record<string, unknown>
g.useRuntimeConfig = () => ({ bookingTokenSecret: 'secreto-de-prueba-no-usar-en-produccion' })
g.createError = (opts: { statusCode: number, message: string }) => {
  const e = new Error(opts.message) as Error & { statusCode?: number }
  e.statusCode = opts.statusCode
  return e
}

const { signBookingToken, verifyBookingToken } = await import('../../app/server/utils/bookingToken')

const BOOKING = 'b8babda1-00a7-4cb3-98f6-62c0ea7ffead'
const OTRA = '3ed924c1-3955-46fa-86d3-e4ab772ef78b'

describe('signBookingToken / verifyBookingToken', () => {
  afterEach(() => vi.useRealTimers())

  it('acepta el token de su propia reserva', () => {
    expect(verifyBookingToken(BOOKING, signBookingToken(BOOKING))).toBe(true)
  })

  it('rechaza el token de otra reserva', () => {
    expect(verifyBookingToken(OTRA, signBookingToken(BOOKING))).toBe(false)
  })

  it('rechaza tokens vacíos o mal formados', () => {
    for (const t of [undefined, null, '', 'basura', 'sin-punto', '.', '123.', '.abc']) {
      expect(verifyBookingToken(BOOKING, t as string | null | undefined), String(t)).toBe(false)
    }
  })

  it('caduca: un token de hace 91 días ya no vale', () => {
    const token = signBookingToken(BOOKING)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 91 * 24 * 60 * 60 * 1000)
    expect(verifyBookingToken(BOOKING, token)).toBe(false)
  })

  it('sigue valiendo a los 89 días', () => {
    const token = signBookingToken(BOOKING)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 89 * 24 * 60 * 60 * 1000)
    expect(verifyBookingToken(BOOKING, token)).toBe(true)
  })

  it('no se puede estirar el vencimiento sin romper la firma', () => {
    const token = signBookingToken(BOOKING)
    const [, firma] = token.split('.')
    const lejano = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60
    expect(verifyBookingToken(BOOKING, `${lejano}.${firma}`)).toBe(false)
  })

  it('falla si no hay secreto configurado, en lugar de firmar con uno conocido', async () => {
    const previo = g.useRuntimeConfig
    g.useRuntimeConfig = () => ({ bookingTokenSecret: '' })
    expect(() => signBookingToken(BOOKING)).toThrow(/BOOKING_TOKEN_SECRET/)
    g.useRuntimeConfig = previo
  })
})
