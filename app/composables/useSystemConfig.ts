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

  const minAdvanceHours = computed(() => config.value?.min_advance_hours ?? 2)
  const commissionMemberPct = computed(() => config.value?.commission_member_pct ?? 10)
  const commissionNonMemberPct = computed(() => config.value?.commission_non_member_pct ?? 12)
  const membershipMonthlyFee = computed(() => config.value?.membership_monthly_fee ?? 20)
  const maxCancelHoursBefore = computed(() => config.value?.max_cancel_hours_before ?? 24)

  return {
    config,
    loaded,
    load,
    minAdvanceHours,
    commissionMemberPct,
    commissionNonMemberPct,
    membershipMonthlyFee,
    maxCancelHoursBefore,
  }
}
