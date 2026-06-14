<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold text-on-surface">Dashboard</h1>
      <span class="text-sm text-on-surface-variant">{{ today }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="card-surface rounded-xl p-6 border border-outline-variant">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
            <Icon name="tabler:calendar-event" size="20" class="text-brand-gold" />
          </div>
          <p class="text-sm text-on-surface-variant">Próximas reservas</p>
        </div>
        <p class="text-3xl font-semibold text-on-surface">{{ upcomingCount }}</p>
      </div>
      <div class="card-surface rounded-xl p-6 border border-outline-variant">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <Icon name="tabler:check" size="20" class="text-success" />
          </div>
          <p class="text-sm text-on-surface-variant">Completadas este mes</p>
        </div>
        <p class="text-3xl font-semibold text-on-surface">{{ completedCount }}</p>
      </div>
      <div class="card-surface rounded-xl p-6 border border-outline-variant">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Icon name="tabler:coin" size="20" class="text-info" />
          </div>
          <p class="text-sm text-on-surface-variant">Ingresos estimados</p>
        </div>
        <p class="text-3xl font-semibold text-on-surface">{{ estimatedEarnings }} €</p>
      </div>
    </div>

    <div class="card-surface rounded-xl border border-outline-variant">
      <div class="flex items-center justify-between p-6 border-b border-outline-variant">
        <h2 class="text-lg font-medium text-on-surface">Próximas reservas</h2>
        <NuxtLink to="/taxista/reservas" class="text-sm text-brand-gold hover:text-gold-600">
          Ver todas
        </NuxtLink>
      </div>
      <div v-if="loading" class="p-6">
        <AppSkeleton />
      </div>
      <div v-else-if="upcomingBookings.length > 0" class="divide-y divide-outline-variant">
        <NuxtLink
          v-for="booking in upcomingBookings.slice(0, 5)"
          :key="booking.id"
          :to="`/taxista/reservas/${booking.id}`"
          class="flex items-center justify-between p-4 hover:bg-surface-container transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="icon-wrap-dark bg-surface-container rounded-full p-2">
              <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
            </div>
            <div>
              <p class="text-sm font-medium text-on-surface">{{ booking.origin_station_name }}</p>
              <p class="text-xs text-on-surface-variant">→ {{ booking.destination_address }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-on-surface">{{ formatTime(booking.pickup_at) }}</p>
            <AppBadge
              :variant="booking.status"
              :label="booking.status === 'pending' ? 'Pendiente' : booking.status === 'confirmed' ? 'Confirmada' : booking.status"
            />
          </div>
        </NuxtLink>
      </div>
      <div v-else class="p-6 text-center">
        <p class="text-on-surface-variant text-sm">No tienes reservas próximas</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const reservations = ref<any[]>([])
const loading = ref(true)

const today = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
)

const upcomingBookings = computed(() =>
  reservations.value.filter((r: any) =>
    r.status === 'pending' || r.status === 'confirmed',
  ).sort((a: any, b: any) => new Date(a.pickup_at).getTime() - new Date(b.pickup_at).getTime()),
)

const upcomingCount = computed(() => upcomingBookings.value.length)

const completedCount = computed(() =>
  reservations.value.filter((r: any) => r.status === 'completed').length,
)

const estimatedEarnings = computed(() => {
  const completed = reservations.value.filter((r: any) => r.status === 'completed')
  return completed.reduce((sum: number, r: any) => sum + Number(r.total_price || 0), 0).toFixed(0)
})

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
