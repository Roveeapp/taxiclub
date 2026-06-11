<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
            <Icon name="tabler:calendar-event" size="20" class="text-brand-gold" />
          </div>
          <p class="text-sm text-gray-500">Reservas hoy</p>
        </div>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.bookingsToday }}</p>
      </div>
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Icon name="tabler:users" size="20" class="text-success" />
          </div>
          <p class="text-sm text-gray-500">Conductores activos</p>
        </div>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.activeDrivers }}</p>
      </div>
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon name="tabler:coin" size="20" class="text-info" />
          </div>
          <p class="text-sm text-gray-500">Ingresos del mes</p>
        </div>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.monthlyRevenue }} €</p>
      </div>
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Icon name="tabler:bolt" size="20" class="text-warning" />
          </div>
          <p class="text-sm text-gray-500">Ofertas activas</p>
        </div>
        <p class="text-3xl font-semibold text-gray-900">{{ metrics.activeOffers }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl border border-gray-200">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-lg font-medium">Reservas recientes</h2>
          <NuxtLink to="/admin/reservas" class="text-sm text-brand-gold hover:text-gold-600">Ver todas</NuxtLink>
        </div>
        <div v-if="recentBookings.length > 0" class="divide-y divide-gray-100">
          <div
            v-for="booking in recentBookings.slice(0, 5)"
            :key="booking.id"
            class="flex items-center justify-between p-4"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ booking.client_name || 'Cliente' }}</p>
              <p class="text-xs text-gray-500">{{ booking.origin_station_name }} → {{ booking.destination_address }}</p>
            </div>
            <AppBadge
              :variant="booking.status"
              :label="statusLabel(booking.status)"
            />
          </div>
        </div>
        <div v-else class="p-6 text-center text-gray-400 text-sm">
          No hay reservas recientes
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-lg font-medium">Conductores</h2>
          <NuxtLink to="/admin/conductores" class="text-sm text-brand-gold hover:text-gold-600">Ver todos</NuxtLink>
        </div>
        <div v-if="drivers.length > 0" class="divide-y divide-gray-100">
          <div
            v-for="driver in drivers.slice(0, 5)"
            :key="driver.id"
            class="flex items-center justify-between p-4"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="tabler:user" size="16" class="text-gray-400" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ driver.full_name }}</p>
                <p class="text-xs text-gray-500">{{ driver.email }}</p>
              </div>
            </div>
            <span
              class="text-xs px-2 py-1 rounded-full"
              :class="driver.is_member ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'"
            >
              {{ driver.is_member ? 'Miembro' : 'No miembro' }}
            </span>
          </div>
        </div>
        <div v-else class="p-6 text-center text-gray-400 text-sm">
          No hay conductores registrados
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const metrics = ref({
  bookingsToday: 0,
  activeDrivers: 0,
  monthlyRevenue: 0,
  activeOffers: 0,
})
const recentBookings = ref<any[]>([])
const drivers = ref<any[]>([])

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

onMounted(async () => {
  try {
    const [metricsData, bookingsData, driversData] = await Promise.all([
      $fetch('/api/admin/metrics'),
      $fetch('/api/admin/reservas?limit=5'),
      $fetch('/api/admin/conductores'),
    ])
    metrics.value = metricsData as any
    recentBookings.value = bookingsData as any[]
    drivers.value = driversData as any[]
  } catch (e) {
    console.error('Error loading dashboard:', e)
  }
})
</script>
