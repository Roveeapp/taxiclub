import { describe, it, expect } from 'vitest'
import { computeSettlement } from '../../app/server/services/payouts'

const config = {
  commission_member_pct: 10,
  commission_non_member_pct: 12,
  membership_monthly_fee: 20,
}
const socio = { isMember: true, isExempt: false, customCommissionPct: null, customMonthlyFee: null, config }
const colaborador = { isMember: false, isExempt: false, customCommissionPct: null, customMonthlyFee: null, config }

describe('computeSettlement — el taxista cobra en mano (modelo del MVP)', () => {
  it('el taxista debe la comisión más la cuota', () => {
    const s = computeSettlement({ ...socio, gross: 450, platformCollects: false })
    expect(s.commissionAmt).toBe(45)
    expect(s.membershipFee).toBe(20)
    expect(s.direction).toBe('driver_pays_platform')
    expect(s.amountDue).toBe(65)
  })

  it('no presenta el bruto como dinero a favor del taxista', () => {
    // El fallo que esto cierra: la pantalla mostraba 385 € «a cobrar»
    const s = computeSettlement({ ...socio, gross: 450, platformCollects: false })
    expect(s.amountDue).not.toBe(385)
    expect(s.balance).toBeLessThan(0)
  })

  it('un colaborador no socio paga el 12 % y ninguna cuota', () => {
    const s = computeSettlement({ ...colaborador, gross: 200, platformCollects: false })
    expect(s.commissionAmt).toBe(24)
    expect(s.membershipFee).toBe(0)
    expect(s.amountDue).toBe(24)
    expect(s.direction).toBe('driver_pays_platform')
  })

  it('un socio exento paga comisión pero no cuota', () => {
    const s = computeSettlement({ ...socio, isExempt: true, gross: 300, platformCollects: false })
    expect(s.membershipFee).toBe(0)
    expect(s.amountDue).toBe(30)
  })

  it('sin viajes, un socio sigue debiendo la cuota', () => {
    const s = computeSettlement({ ...socio, gross: 0, platformCollects: false })
    expect(s.amountDue).toBe(20)
    expect(s.direction).toBe('driver_pays_platform')
  })

  it('respeta la comisión y la cuota personalizadas del conductor', () => {
    const s = computeSettlement({
      ...socio, gross: 1000, customCommissionPct: 5, customMonthlyFee: 50, platformCollects: false,
    })
    expect(s.commissionAmt).toBe(50)
    expect(s.membershipFee).toBe(50)
    expect(s.amountDue).toBe(100)
  })
})

describe('computeSettlement — cobra la plataforma (modelo futuro)', () => {
  it('la plataforma transfiere el bruto menos comisión y cuota', () => {
    const s = computeSettlement({ ...socio, gross: 450, platformCollects: true })
    expect(s.direction).toBe('platform_pays_driver')
    expect(s.amountDue).toBe(385)
  })

  it('invierte el sentido si la cuota se come el neto', () => {
    // Caso límite real: un socio con pocos viajes. 10 € de bruto, 1 € de
    // comisión, 20 € de cuota → debe 11 €, no se le puede transferir nada.
    const s = computeSettlement({ ...socio, gross: 10, platformCollects: true })
    expect(s.direction).toBe('driver_pays_platform')
    expect(s.amountDue).toBe(11)
  })

  it('con saldo exactamente cero no hay nada que liquidar', () => {
    const s = computeSettlement({
      ...colaborador, gross: 0, customCommissionPct: 0, customMonthlyFee: 0, platformCollects: true,
    })
    expect(s.amountDue).toBe(0)
  })
})

describe('computeSettlement — invariantes de los dos modelos', () => {
  it('la comisión y la cuota no dependen del sentido', () => {
    const conPagos = computeSettlement({ ...socio, gross: 450, platformCollects: true })
    const sinPagos = computeSettlement({ ...socio, gross: 450, platformCollects: false })
    expect(sinPagos.commissionAmt).toBe(conPagos.commissionAmt)
    expect(sinPagos.membershipFee).toBe(conPagos.membershipFee)
    expect(sinPagos.commissionPct).toBe(conPagos.commissionPct)
  })

  it('el importe a liquidar nunca es negativo', () => {
    for (const gross of [0, 1, 10, 199.99, 450, 10_000]) {
      for (const platformCollects of [true, false]) {
        const s = computeSettlement({ ...socio, gross, platformCollects })
        expect(s.amountDue, `${gross}/${platformCollects}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('los dos sentidos suman el bruto: lo que se queda el club más lo que le queda al taxista', () => {
    const gross = 450
    const s = computeSettlement({ ...socio, gross, platformCollects: false })
    // El taxista se queda el bruto menos lo que paga al club
    expect(Math.round((gross - s.amountDue) * 100) / 100).toBe(385)
  })

  it('redondea a céntimos, sin arrastrar decimales', () => {
    const s = computeSettlement({ ...socio, gross: 333.33, platformCollects: false })
    expect(s.amountDue).toBe(Math.round(s.amountDue * 100) / 100)
    expect(String(s.amountDue)).not.toMatch(/\.\d{3}/)
  })
})
