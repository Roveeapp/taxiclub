<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-on-surface">Ofertas</h1>
        <p class="text-sm text-on-surface-variant mt-1">Todas las ofertas de Última Hora de la plataforma</p>
      </div>
      <AppFilterTabs v-model="activeFilter" :opciones="filters" />
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" >
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Total</p>
          <p class="text-2xl font-semibold text-on-surface">{{ data.totals.total }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Activas</p>
          <p class="text-2xl font-semibold text-success">{{ data.totals.active }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Reservadas</p>
          <p class="text-2xl font-semibold text-brand-gold">{{ data.totals.booked }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Conversión</p>
          <p class="text-2xl font-semibold text-on-surface">{{ conversionRate }}%</p>
        </div>
        <div class="card-surface rounded-xl p-5 col-span-2 md:col-span-1">
          <p class="text-xs text-on-surface-variant mb-1">Valor reservado</p>
          <p class="text-2xl font-semibold text-brand-gold">{{ data.totals.bookedValue.toFixed(0) }} €</p>
        </div>
      </div>

      <div class="card-surface rounded-xl overflow-hidden">
        <table class="w-full responsive-table">
          <thead class="bg-surface-container border-b border-outline-variant">
            <tr>
              <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Taxista</th>
              <th class="text-left text-xs font-medium text-on-surface-variant px-4 py-3">Ruta</th>
              <th class="text-left text-xs font-medium text-on-surface-variant px-4 py-3">Ventana</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Precio</th>
              <th class="text-center text-xs font-medium text-on-surface-variant px-6 py-3">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="o in filteredOffers" :key="o.id" class="hover:bg-surface-container transition-colors">
              <td class="px-6 py-4 mobile-primary" data-label="Taxista">
                <NuxtLink :to="`/admin/conductores/${o.driver_id}`" class="text-sm font-medium text-on-surface hover:text-brand-gold">
                  {{ o.driver_name }}
                </NuxtLink>
                <span class="md:hidden text-xs px-2.5 py-1 rounded-full font-medium ml-2" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
              <td class="px-4 py-4" data-label="Ruta">
                <div>
                  <p class="text-sm text-on-surface truncate max-w-[260px] md:max-w-none">{{ o.origin_address }} → {{ o.destination_station_name }}</p>
                  <p v-if="o.discount_pct > 0" class="text-[11px] text-secondary">-{{ o.discount_pct }}% descuento</p>
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-on-surface-variant" data-label="Ventana">
                {{ formatWindow(o.available_from, o.available_until) }}
              </td>
              <td class="px-4 py-4 text-right" data-label="Precio">
                <span v-if="o.discount_pct > 0" class="text-[11px] text-on-surface-variant line-through mr-1">{{ Number(o.base_price).toFixed(2) }}</span>
                <span class="text-sm font-medium text-brand-gold">{{ Number(o.final_price).toFixed(2) }} €</span>
              </td>
              <td class="px-6 py-4 text-center hidden md:table-cell" data-label="Estado">
                <span class="text-xs px-2.5 py-1 rounded-full font-medium" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredOffers.length === 0" class="p-8 text-center text-on-surface-variant text-sm">
          No hay ofertas con este filtro
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const data = ref<any>(null)
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'booked', label: 'Reservadas' },
  { value: 'expired', label: 'Expiradas' },
  { value: 'cancelled', label: 'Canceladas' },
]

const filteredOffers = computed(() => {
  const offers = data.value?.offers || []
  if (activeFilter.value === 'all') return offers
  return offers.filter((o: any) => o.status === activeFilter.value)
})

const conversionRate = computed(() => {
  const t = data.value?.totals
  if (!t) return 0
  const closed = t.booked + t.expired + t.cancelled
  if (closed === 0) return 0
  return Math.round((t.booked / closed) * 100)
})

function formatWindow(from: string, until: string) {
  const f = new Date(from)
  const u = new Date(until)
  const day = f.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const t = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${t(f)}–${t(u)}`
}

function statusLabel(status: string) {
  switch (status) {
    case 'active': return 'Activa'
    case 'booked': return 'Reservada'
    case 'expired': return 'Expirada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'active': return 'bg-success/15 text-success'
    case 'booked': return 'bg-secondary/15 text-secondary'
    case 'expired': return 'bg-surface-container-high text-on-surface-variant'
    case 'cancelled': return 'bg-error/10 text-error'
    default: return 'bg-surface-container-high text-on-surface-variant'
  }
}

onMounted(async () => {
  try {
    data.value = await $fetch('/api/admin/ofertas')
  } catch (e) {
    console.error('Error loading offers:', e)
  } finally {
    loading.value = false
  }
})
</script>
