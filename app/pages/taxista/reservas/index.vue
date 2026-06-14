<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mis reservas</h1>
      <div class="flex gap-2">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="activeFilter === filter.value
            ? 'bg-brand-dark text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card-surface rounded-xl p-6 border border-outline-variant">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="filteredBookings.length > 0" class="space-y-3">
      <NuxtLink
        v-for="booking in filteredBookings"
        :key="booking.id"
        :to="`/taxista/reservas/${booking.id}`"
        class="block card-surface rounded-xl p-5 border border-outline-variant hover:border-brand-gold transition-colors"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="icon-wrap-dark">
              <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
            </div>
            <div>
              <p class="text-sm font-medium text-on-surface">{{ booking.origin_station_name }}</p>
              <p class="text-xs text-on-surface-variant">→ {{ booking.destination_address }}</p>
            </div>
          </div>
          <AppBadge
            :variant="booking.status"
            :label="statusLabel(booking.status)"
          />
        </div>

        <div class="flex items-center gap-4 text-xs text-on-surface-variant">
          <span class="flex items-center gap-1">
            <Icon name="tabler:calendar" size="14" />
            {{ formatDate(booking.pickup_at) }}
          </span>
          <span class="flex items-center gap-1">
            <Icon name="tabler:clock" size="14" />
            {{ formatTime(booking.pickup_at) }}
          </span>
          <span class="flex items-center gap-1">
            <Icon name="tabler:users" size="14" />
            {{ booking.passengers }}
          </span>
        </div>

        <div v-if="booking.confirmed_at" class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <Icon name="tabler:check" size="14" class="text-success" />
          <span class="text-xs text-success">Confirmada — {{ booking.confirmed_plate }}</span>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="card-surface rounded-xl p-12 border border-outline-variant text-center">
      <Icon name="tabler:calendar" size="48" class="mx-auto text-gray-200 mb-4" />
      <p class="text-on-surface-variant">No hay reservas {{ activeFilter !== 'all' ? 'con este estado' : '' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const reservations = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
]

const filteredBookings = computed(() => {
  if (activeFilter.value === 'all') return reservations.value
  return reservations.value.filter((b: any) => b.status === activeFilter.value)
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/taxista/reservas')
    reservations.value = data as any[]
  } catch (e) {
    console.error('Error loading reservations:', e)
  } finally {
    loading.value = false
  }
})
</script>
