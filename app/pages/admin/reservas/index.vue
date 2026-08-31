<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Reservas</h1>
      <div class="flex gap-2">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="activeFilter === filter.value
            ? 'bg-secondary text-on-secondary'
            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="card-surface rounded-xl overflow-hidden">
      <table class="w-full">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Cliente</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Ruta</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Fecha</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Estado</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Precio</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="booking in filteredBookings" :key="booking.id" class="hover:bg-surface-container transition-colors">
            <td class="px-6 py-4 text-sm text-on-surface">{{ booking.client_name || 'Cliente' }}</td>
            <td class="px-6 py-4">
              <p class="text-sm text-on-surface">{{ booking.origin_station_name }}</p>
              <p class="text-xs text-on-surface-variant">→ {{ booking.destination_address }}</p>
            </td>
            <td class="px-6 py-4 text-sm text-on-surface-variant">{{ formatDateTime(booking.pickup_at) }}</td>
            <td class="px-6 py-4">
              <AppBadge
                :variant="booking.status"
                :label="statusLabel(booking.status)"
              />
            </td>
            <td class="px-6 py-4 text-sm font-medium text-on-surface">{{ Number(booking.total_price).toFixed(2) }} €</td>
            <td class="px-6 py-4 text-right">
              <NuxtLink
                :to="`/admin/reservas/${booking.id}`"
                class="text-sm text-brand-gold hover:text-gold-600 mr-3"
              >
                Ver
              </NuxtLink>
              <button
                v-if="booking.status !== 'cancelled' && booking.status !== 'completed'"
                class="text-sm text-error hover:text-red-400"
                @click="handleCancel(booking.id)"
              >
                Cancelar
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredBookings.length === 0" class="p-6 text-center text-on-surface-variant text-sm">
        No hay reservas con este filtro
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { confirmar } = useConfirmacion()

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const bookings = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
]

const filteredBookings = computed(() => {
  if (activeFilter.value === 'all') return bookings.value
  return bookings.value.filter((b: any) => b.status === activeFilter.value)
})

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/reservas')
    bookings.value = data as any[]
  } catch (e) {
    console.error('Error loading bookings:', e)
  } finally {
    loading.value = false
  }
})

async function handleCancel(id: string) {
  if (!await confirmar({
    titulo: 'Cancelar la reserva',
    mensaje: 'Se cancelará la reserva y se liberará la pre-autorización del pago, si la hubiera.',
    textoConfirmar: 'Cancelar la reserva',
    destructivo: true,
  })) return
  try {
    await $fetch(`/api/admin/reservas/${id}/cancelar`, {
      method: 'POST',
      body: { reason: 'Cancelada por administrador' },
    })
    const booking = bookings.value.find((b: any) => b.id === id)
    if (booking) booking.status = 'cancelled'
  } catch (e) {
    console.error('Error cancelling booking:', e)
  }
}
</script>
