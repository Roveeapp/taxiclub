export interface PayoutInput {
  gross: number
  isMember: boolean
  isExempt: boolean
  customCommissionPct?: number | null
  customMonthlyFee?: number | null
  config: Record<string, unknown>
}

/**
 * Cálculo puro de la liquidación mensual (testeado en tests/unit/payouts.spec.ts).
 * Prioridad: valores personalizados del conductor > configuración global.
 */
export function computePayoutBreakdown(input: PayoutInput) {
  const { gross, isMember, isExempt, customCommissionPct, customMonthlyFee, config } = input

  const commissionPct = customCommissionPct !== null && customCommissionPct !== undefined
    ? Number(customCommissionPct)
    : isMember
      ? Number(config.commission_member_pct || 10)
      : Number(config.commission_non_member_pct || 12)

  const commissionAmt = Math.round(gross * commissionPct) / 100
  const net = Math.round((gross - commissionAmt) * 100) / 100

  const membershipFee = (isMember && !isExempt)
    ? (customMonthlyFee !== null && customMonthlyFee !== undefined
        ? Number(customMonthlyFee)
        : Number(config.membership_monthly_fee || 20))
    : 0

  const finalPayout = Math.round((net - membershipFee) * 100) / 100

  return { commissionPct, commissionAmt, net, membershipFee, finalPayout }
}

/**
 * Dirección del saldo mensual entre el club y el taxista.
 *
 * El negocio funciona en dos sentidos según quién cobre al cliente:
 *
 *   · `platform_pays_driver` — la plataforma cobra al cliente y le transfiere al
 *     taxista el bruto menos la comisión y la cuota.
 *   · `driver_pays_platform` — el taxista cobra en mano y le debe al club la
 *     comisión más la cuota. Es el modelo del MVP.
 */
export type SettlementDirection = 'platform_pays_driver' | 'driver_pays_platform'

export interface SettlementInput extends PayoutInput {
  /** true cuando la plataforma cobra al cliente (bandera payments_enabled). */
  platformCollects: boolean
}

export interface Settlement {
  gross: number
  commissionPct: number
  commissionAmt: number
  membershipFee: number
  /** Saldo con signo desde el punto de vista del taxista: positivo, a su favor. */
  balance: number
  direction: SettlementDirection
  /** Importe a liquidar, siempre positivo, en la dirección indicada. */
  amountDue: number
  /** Solo tiene sentido cuando cobra la plataforma; se conserva por compatibilidad. */
  net: number
  finalPayout: number
}

/**
 * Liquidación mensual en los dos sentidos.
 *
 * Se apoya en computePayoutBreakdown, que calcula comisión y cuota —incluidos
 * los importes personalizados por conductor y las exenciones— y que no depende
 * de la dirección: esos dos números son los mismos en ambos modelos.
 *
 * La dirección sale del signo del saldo, no de la bandera, y eso cubre un caso
 * límite real: con pagos activos, un taxista con pocos viajes puede tener una
 * cuota mayor que su neto, y entonces es él quien debe. Decidirlo por el signo
 * evita tener que tratar ese caso aparte.
 */
export function computeSettlement(input: SettlementInput): Settlement {
  const { commissionPct, commissionAmt, net, membershipFee, finalPayout } = computePayoutBreakdown(input)

  const balance = input.platformCollects
    // La plataforma tiene el dinero del cliente: le devuelve el bruto menos lo suyo
    ? finalPayout
    // El taxista tiene el dinero: debe la comisión y la cuota
    : Math.round(-(commissionAmt + membershipFee) * 100) / 100

  return {
    gross: input.gross,
    commissionPct,
    commissionAmt,
    membershipFee,
    balance,
    direction: balance >= 0 ? 'platform_pays_driver' : 'driver_pays_platform',
    amountDue: Math.abs(balance),
    net,
    finalPayout,
  }
}

export async function calculateMonthlyPayout(driverId: string, month: Date) {
  const config = await getSystemConfig()

  const { data: driver, error } = await callRpc<Array<Record<string, unknown>>>('get_driver_payout_data', {
    p_driver_id: driverId,
  })

  const d = driver?.[0] as { full_name?: string | null, is_member?: boolean, is_exempt?: boolean, custom_commission_pct?: number | null, custom_monthly_fee?: number | null } | undefined
  if (error || !d) {
    throw new Error('Driver not found')
  }


  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59)

  const { data: trips } = await callRpc<Array<Record<string, unknown>>>('get_trips_for_payout', {
    p_driver_id: driverId,
    p_month_start: monthStart.toISOString(),
    p_month_end: monthEnd.toISOString(),
  })

  const gross = (trips || []).reduce((sum: number, t) => sum + Number(t.total_price ?? 0), 0)

  const settlement = computeSettlement({
    gross,
    isMember: !!d.is_member,
    isExempt: !!d.is_exempt,
    customCommissionPct: d.custom_commission_pct,
    customMonthlyFee: d.custom_monthly_fee,
    config,
    // La bandera decide quién cobra al cliente, y con ello el sentido del saldo
    platformCollects: await arePaymentsEnabled(),
  })

  return {
    driverId,
    driverName: d.full_name,
    periodStart: monthStart,
    periodEnd: monthEnd,
    tripCount: (trips || []).length,
    ...settlement,
  }
}
