export function useSystemConfig() {
  const config = useState<Record<string, any>>('systemConfig', () => ({}))
  const loaded = useState('systemConfigLoaded', () => false)

  const load = async () => {
    if (loaded.value) return
    try {
      config.value = await $fetch('/api/config')
      loaded.value = true
    } catch {
      config.value = {}
    }
  }

  // El valor por defecto tiene que coincidir con el de la base de datos (12).
  // Antes era 2 aquí y en admin/comisiones.vue, así que si la configuración no
  // cargaba el formulario ofrecía huecos que el negocio no acepta — y el
  // servidor los rechaza.
  const minAdvanceHours = computed(() => Number(config.value?.min_advance_hours ?? 12))
  const commissionMemberPct = computed(() => config.value?.commission_member_pct ?? 10)
  const commissionNonMemberPct = computed(() => config.value?.commission_non_member_pct ?? 12)
  const membershipMonthlyFee = computed(() => config.value?.membership_monthly_fee ?? 20)
  const maxCancelHoursBefore = computed(() => Number(config.value?.max_cancel_hours_before ?? 24))

  /**
   * ¿Están los pagos activados? El MVP sale con ellos desactivados, así que la
   * interfaz debe contarlo como una forma de operar y no como una avería.
   */
  const paymentsEnabled = computed(() => {
    const v = String(config.value?.payments_enabled ?? 'false').toLowerCase()
    return v === 'true' || v === '1'
  })

  return {
    config,
    loaded,
    load,
    minAdvanceHours,
    commissionMemberPct,
    commissionNonMemberPct,
    membershipMonthlyFee,
    maxCancelHoursBefore,
    paymentsEnabled,
  }
}
