<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Mis liquidaciones</h1>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card-surface rounded-xl p-6 border border-outline-variant">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="payouts.length > 0" class="space-y-3">
      <div
        v-for="payout in payouts"
        :key="payout.id"
        class="card-surface rounded-xl p-6 border border-outline-variant"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm font-medium text-on-surface">
              {{ formatDate(payout.period_start) }} — {{ formatDate(payout.period_end) }}
            </p>
            <p class="text-xs text-on-surface-variant">
              {{ payout.stripe_payout_id ? 'Pagado' : 'Pendiente' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-semibold text-success">{{ Number(payout.final_payout).toFixed(2) }} €</p>
            <p class="text-xs text-on-surface-variant">neto</p>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100">
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Bruto</p>
            <p class="text-sm font-medium text-on-surface">{{ Number(payout.gross_amount).toFixed(2) }} €</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Comisión</p>
            <p class="text-sm font-medium text-error">-{{ Number(payout.commission_amt).toFixed(2) }} €</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Cuota</p>
            <p class="text-sm font-medium text-error">-{{ Number(payout.membership_fee || 0).toFixed(2) }} €</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Neto</p>
            <p class="text-sm font-medium text-success">{{ Number(payout.final_payout).toFixed(2) }} €</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card-surface rounded-xl p-12 border border-outline-variant text-center">
      <Icon name="tabler:coin" size="48" class="mx-auto text-gray-200 mb-4" />
      <p class="text-on-surface-variant">No hay liquidaciones todavía</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const payouts = ref<any[]>([])
const loading = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/taxista/liquidaciones')
    payouts.value = data as any[]
  } catch (e) {
    console.error('Error loading payouts:', e)
  } finally {
    loading.value = false
  }
})
</script>
