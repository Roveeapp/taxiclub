<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Liquidaciones</h1>
      <AppButton variant="gold" @click="handleProcess" :loading="processing">
        <Icon name="ti:coin" size="16" class="mr-1" />
        Procesar liquidaciones del mes
      </AppButton>
    </div>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else-if="payouts.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Conductor</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Período</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Bruto</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Comisión</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Cuota</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Neto</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="payout in payouts" :key="payout.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <p class="text-sm font-medium text-gray-900">{{ payout.driver_name }}</p>
              <p class="text-xs text-gray-500">{{ payout.driver_email }}</p>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
              {{ formatDate(payout.period_start) }} - {{ formatDate(payout.period_end) }}
            </td>
            <td class="px-6 py-4 text-sm text-right text-gray-900">{{ Number(payout.gross_amount).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right text-error">-{{ Number(payout.commission_amt).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right text-error">-{{ Number(payout.membership_fee || 0).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right font-semibold text-success">{{ Number(payout.final_payout).toFixed(2) }} €</td>
            <td class="px-6 py-4">
              <span
                class="text-xs px-2 py-1 rounded-full"
                :class="payout.paid_at ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
              >
                {{ payout.paid_at ? 'Pagado' : 'Pendiente' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="bg-white rounded-xl p-12 border border-gray-200 text-center">
      <Icon name="ti:coin" size="48" class="mx-auto text-gray-200 mb-4" />
      <p class="text-gray-400">No hay liquidaciones procesadas</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const payouts = ref<any[]>([])
const loading = ref(true)
const processing = ref(false)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/liquidaciones')
    payouts.value = data as any[]
  } catch (e) {
    console.error('Error loading payouts:', e)
  } finally {
    loading.value = false
  }
})

async function handleProcess() {
  if (!confirm('¿Procesar liquidaciones para todos los conductores activos?')) return
  processing.value = true
  try {
    await $fetch('/api/admin/liquidaciones/procesar', { method: 'POST' })
    const data = await $fetch('/api/admin/liquidaciones')
    payouts.value = data as any[]
  } catch (e) {
    console.error('Error processing payouts:', e)
  } finally {
    processing.value = false
  }
}
</script>
