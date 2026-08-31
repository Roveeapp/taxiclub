<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 class="text-2xl font-semibold">Liquidaciones</h1>
      <AppButton variant="gold" :full-width="false" class="w-full sm:w-auto" @click="handleProcess" :loading="processing">
        <Icon name="tabler:coin" size="16" class="mr-1" />
        Procesar liquidaciones del mes
      </AppButton>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else-if="payouts.length > 0" class="card-surface rounded-xl overflow-hidden">
      <table class="w-full responsive-table">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Conductor</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Período</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Bruto</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Comisión</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Cuota</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Saldo</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="payout in payouts" :key="payout.id" class="hover:bg-surface-container transition-colors">
            <td class="px-6 py-4 mobile-primary" data-label="Conductor">
              <div>
                <p class="text-sm font-medium text-on-surface">{{ payout.driver_name }}</p>
                <p class="text-xs text-on-surface-variant">{{ payout.driver_email }}</p>
              </div>
              <span class="md:hidden text-xs px-2 py-1 rounded-full ml-auto" :class="payout.paid_at ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
                {{ payout.paid_at ? 'Pagado' : 'Pendiente' }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-on-surface-variant" data-label="Período">
              {{ formatDate(payout.period_start) }} - {{ formatDate(payout.period_end) }}
            </td>
            <td class="px-6 py-4 text-sm text-right text-on-surface" data-label="Bruto">{{ Number(payout.gross_amount).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right text-on-surface" data-label="Comisión">{{ Number(payout.commission_amt).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right text-on-surface" data-label="Cuota">{{ Number(payout.membership_fee || 0).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-sm text-right font-semibold" data-label="Saldo">
              <span :class="cobramos(payout) ? 'text-warning' : 'text-success'">
                {{ cobramos(payout) ? '+' : '−' }}{{ importe(payout).toFixed(2) }} €
              </span>
              <span class="block text-xs font-normal text-on-surface-variant">
                {{ cobramos(payout) ? 'nos debe' : 'le pagamos' }}
              </span>
            </td>
            <td class="px-6 py-4 hidden md:table-cell" data-label="Estado">
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

    <div v-else class="card-surface rounded-xl p-12 text-center">
      <Icon name="tabler:coin" size="48" class="mx-auto text-on-surface-variant/30 mb-4" />
      <p class="text-on-surface-variant">No hay liquidaciones procesadas</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

/**
 * La liquidación va en dos sentidos según quién cobre al cliente. En el modelo
 * del MVP el taxista cobra en mano, así que el saldo es a favor del club: esta
 * tabla mostraba `final_payout` en verde como si le pagáramos nosotros.
 */
type Liquidacion = Record<string, unknown>

function cobramos(payout: Liquidacion): boolean {
  return payout.direction === 'driver_pays_platform'
}

function importe(payout: Liquidacion): number {
  const due = payout.amount_due
  if (due !== null && due !== undefined) return Math.abs(Number(due))
  return Math.abs(Number(payout.final_payout ?? 0))
}

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
