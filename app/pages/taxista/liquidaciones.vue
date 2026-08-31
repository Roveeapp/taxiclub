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
              {{ estado(payout) }}
            </p>
          </div>
          <div class="text-right">
            <p
              class="text-2xl font-semibold"
              :class="debe(payout) ? 'text-warning' : 'text-success'"
            >
              {{ importe(payout).toFixed(2) }} €
            </p>
            <p class="text-xs text-on-surface-variant">
              {{ debe(payout) ? 'a pagar al club' : 'a recibir' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100">
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Viajes</p>
            <p class="text-sm font-medium text-on-surface">
              {{ Number(payout.gross_amount).toFixed(2) }} €
            </p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Comisión</p>
            <p class="text-sm font-medium text-on-surface">{{ Number(payout.commission_amt).toFixed(2) }} €</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">Cuota</p>
            <p class="text-sm font-medium text-on-surface">{{ Number(payout.membership_fee || 0).toFixed(2) }} €</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-on-surface-variant">{{ debe(payout) ? 'Debes' : 'Recibes' }}</p>
            <p
              class="text-sm font-medium"
              :class="debe(payout) ? 'text-warning' : 'text-success'"
            >
              {{ importe(payout).toFixed(2) }} €
            </p>
          </div>
        </div>

        <p v-if="debe(payout)" class="text-xs text-on-surface-variant mt-3 pt-3 border-t border-gray-100">
          Cobraste {{ Number(payout.gross_amount).toFixed(2) }} € directamente de los clientes.
          De ahí, {{ importe(payout).toFixed(2) }} € corresponden al club.
        </p>
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

/**
 * La liquidación va en dos sentidos según quién cobre al cliente. Con el modelo
 * del MVP el taxista cobra en mano y es él quien debe al club la comisión y la
 * cuota, así que esta pantalla no puede presentar el importe como dinero a su
 * favor: antes mostraba `final_payout` en verde, que con 450 € de bruto le
 * enseñaba 385 € «a cobrar» cuando en realidad debía 65 €.
 *
 * `direction` viene de la base de datos; las filas antiguas sin ese dato se
 * interpretan como el modelo antiguo, en el que cobraba la plataforma.
 */
type Liquidacion = Record<string, unknown>

function debe(payout: Liquidacion): boolean {
  return payout.direction === 'driver_pays_platform'
}

function importe(payout: Liquidacion): number {
  const due = payout.amount_due
  if (due !== null && due !== undefined) return Math.abs(Number(due))
  // Compatibilidad con filas generadas antes de que existiera la dirección
  return Math.abs(Number(payout.final_payout ?? 0))
}

function estado(payout: Liquidacion): string {
  if (payout.paid_at || payout.stripe_payout_id) return 'Liquidada'
  return debe(payout) ? 'Pendiente de pago' : 'Pendiente de cobro'
}

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
