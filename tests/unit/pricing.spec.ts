import { describe, it, expect } from 'vitest'
import { computeFare } from '../../app/server/services/pricing'

describe('computeFare', () => {
  const base = { baseFare: 4, perKm: 1.2, minFare: 10 }

  it('calcula base + km × tarifa', () => {
    // 4 + 20 × 1.2 = 28
    expect(computeFare({ ...base, distanceKm: 20 })).toBe(28)
  })

  it('redondea a 0,50 €', () => {
    // 4 + 10.3 × 1.2 = 16.36 → 16.5
    expect(computeFare({ ...base, distanceKm: 10.3 })).toBe(16.5)
  })

  it('aplica tarifa mínima en trayectos cortos', () => {
    // 4 + 2 × 1.2 = 6.4 → mínimo 10
    expect(computeFare({ ...base, distanceKm: 2 })).toBe(10)
  })

  it('distancia cero devuelve el mínimo', () => {
    expect(computeFare({ ...base, distanceKm: 0 })).toBe(10)
  })

  it('respeta tarifas configuradas distintas', () => {
    // 2 + 15 × 2 = 32
    expect(computeFare({ baseFare: 2, perKm: 2, minFare: 5, distanceKm: 15 })).toBe(32)
  })
})
