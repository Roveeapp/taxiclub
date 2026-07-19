import { describe, it, expect } from 'vitest'
import { computePayoutBreakdown } from '../../app/server/services/payouts'

const config = {
  commission_member_pct: 10,
  commission_non_member_pct: 12,
  membership_monthly_fee: 20,
}

describe('computePayoutBreakdown', () => {
  it('miembro con valores globales', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: true, isExempt: false, config,
    })
    expect(r.commissionPct).toBe(10)
    expect(r.commissionAmt).toBe(100)
    expect(r.net).toBe(900)
    expect(r.membershipFee).toBe(20)
    expect(r.finalPayout).toBe(880)
  })

  it('no miembro paga más comisión y sin cuota', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: false, isExempt: false, config,
    })
    expect(r.commissionPct).toBe(12)
    expect(r.membershipFee).toBe(0)
    expect(r.finalPayout).toBe(880)
  })

  it('comisión personalizada tiene prioridad', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: true, isExempt: false,
      customCommissionPct: 5, config,
    })
    expect(r.commissionPct).toBe(5)
    expect(r.commissionAmt).toBe(50)
    expect(r.finalPayout).toBe(930)
  })

  it('cuota personalizada tiene prioridad', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: true, isExempt: false,
      customMonthlyFee: 5, config,
    })
    expect(r.membershipFee).toBe(5)
    expect(r.finalPayout).toBe(895)
  })

  it('comisión personalizada 0 es válida (no cae al global)', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: true, isExempt: false,
      customCommissionPct: 0, config,
    })
    expect(r.commissionPct).toBe(0)
    expect(r.commissionAmt).toBe(0)
  })

  it('exento no paga cuota aunque tenga una personalizada', () => {
    const r = computePayoutBreakdown({
      gross: 1000, isMember: true, isExempt: true,
      customMonthlyFee: 50, config,
    })
    expect(r.membershipFee).toBe(0)
  })

  it('redondeo a céntimos', () => {
    const r = computePayoutBreakdown({
      gross: 123.45, isMember: true, isExempt: false, config,
    })
    expect(r.commissionAmt).toBe(12.35)
    expect(r.net).toBe(111.1)
    expect(r.finalPayout).toBe(91.1)
  })

  it('config vacía usa defaults (10%/12%, 20 €)', () => {
    const r = computePayoutBreakdown({
      gross: 100, isMember: true, isExempt: false, config: {},
    })
    expect(r.commissionPct).toBe(10)
    expect(r.membershipFee).toBe(20)
  })
})
