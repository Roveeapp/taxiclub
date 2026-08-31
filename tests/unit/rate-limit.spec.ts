import { describe, it, expect } from 'vitest'
import {
  rateLimitRuleForRequest,
  rateLimitKey,
  secondsUntilReset,
} from '../../app/server/utils/rateLimit'

describe('rateLimitRuleForRequest', () => {
  it('limita las cinco rutas públicas sin autenticación', () => {
    expect(rateLimitRuleForRequest('POST', '/api/bookings')?.limit).toBe(5)
    expect(rateLimitRuleForRequest('POST', '/api/auth/register')?.limit).toBe(5)
    expect(rateLimitRuleForRequest('POST', '/api/payments/create-intent')?.limit).toBe(60)
    expect(rateLimitRuleForRequest('POST', '/api/log-error')?.limit).toBe(30)
    expect(rateLimitRuleForRequest('GET', '/api/addresses/search')?.limit).toBe(120)
  })

  it('limita también reservar una oferta, que no exige cuenta y lleva pago detrás', () => {
    expect(rateLimitRuleForRequest('POST', '/api/ofertas/abc-123/reservar')?.bucket).toBe('ofertas')
    expect(rateLimitRuleForRequest('POST', '/api/ofertas/abc-123/intent')?.bucket).toBe('ofertas')
  })

  it('es generoso con el autocompletado, que dispara al escribir', () => {
    const buscar = rateLimitRuleForRequest('GET', '/api/addresses/search')!
    const reservar = rateLimitRuleForRequest('POST', '/api/bookings')!
    expect(buscar.limit).toBeGreaterThan(reservar.limit * 10)
  })

  it('ignora la query al elegir el cubo', () => {
    const a = rateLimitRuleForRequest('GET', '/api/addresses/search?q=Oviedo')
    const b = rateLimitRuleForRequest('GET', '/api/addresses/search?q=Aviles')
    expect(a?.bucket).toBe('addresses')
    expect(a?.bucket).toBe(b?.bucket)
  })

  it('distingue el método: un GET a /api/bookings no se limita', () => {
    expect(rateLimitRuleForRequest('GET', '/api/bookings')).toBeNull()
  })

  it('no limita las rutas autenticadas ni las de solo lectura', () => {
    for (const p of ['/api/config', '/api/stations', '/api/taxista/vehiculos', '/api/admin/reservas']) {
      expect(rateLimitRuleForRequest('GET', p), p).toBeNull()
    }
  })

  it('cada ruta tiene su propio cubo, para que no se agoten entre ellas', () => {
    const cubos = ['/api/bookings', '/api/auth/register', '/api/payments/create-intent', '/api/log-error']
      .map(p => rateLimitRuleForRequest('POST', p)!.bucket)
    expect(new Set(cubos).size).toBe(cubos.length)
  })
})

describe('rateLimitKey', () => {
  const regla = { bucket: 'bookings', limit: 5, windowSeconds: 3600 }

  it('separa el contador por IP', () => {
    const t = 1_700_000_000_000
    expect(rateLimitKey(regla, '1.1.1.1', t)).not.toBe(rateLimitKey(regla, '2.2.2.2', t))
  })

  it('mantiene la clave dentro de la misma ventana', () => {
    const t = 1_700_000_000_000
    expect(rateLimitKey(regla, '1.1.1.1', t)).toBe(rateLimitKey(regla, '1.1.1.1', t + 60_000))
  })

  it('cambia de clave al pasar a la ventana siguiente', () => {
    const t = 1_700_000_000_000
    expect(rateLimitKey(regla, '1.1.1.1', t)).not.toBe(rateLimitKey(regla, '1.1.1.1', t + 3_600_000))
  })
})

describe('secondsUntilReset', () => {
  const regla = { bucket: 'x', limit: 1, windowSeconds: 3600 }

  it('devuelve un valor dentro de la ventana', () => {
    const s = secondsUntilReset(regla, Date.now())
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(3600)
  })

  it('en el inicio exacto de la ventana falta la ventana completa', () => {
    expect(secondsUntilReset(regla, 3_600_000)).toBe(3600)
  })
})
