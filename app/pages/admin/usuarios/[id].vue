<template>
  <div>
    <NuxtLink to="/admin/usuarios" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a usuarios
    </NuxtLink>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else-if="user" class="space-y-6 max-w-4xl">
      <!-- Perfil -->
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
            <Icon name="tabler:user" size="28" class="text-on-surface-variant" />
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-semibold text-on-surface">{{ user.full_name || 'Sin nombre' }}</h1>
            <p class="text-sm text-on-surface-variant">{{ user.email }}</p>
            <p class="text-sm text-on-surface-variant">
              <span v-if="user.phone">{{ user.phone }} · </span>
              cliente desde {{ formatDate(user.created_at) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Reservas</p>
          <p class="text-2xl font-semibold text-on-surface">{{ user.stats.total }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Completadas</p>
          <p class="text-2xl font-semibold text-success">{{ user.stats.completed }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Canceladas</p>
          <p class="text-2xl font-semibold text-on-surface-variant">{{ user.stats.cancelled }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Gasto total</p>
          <p class="text-2xl font-semibold text-brand-gold">{{ user.stats.spent.toFixed(2) }} €</p>
        </div>
      </div>

      <!-- Historial -->
      <div class="card-surface rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 class="text-lg font-medium text-on-surface">Historial de reservas</h2>
          <span v-if="user.stats.offerBookings > 0" class="text-xs text-on-surface-variant">
            {{ user.stats.offerBookings }} vía Última Hora
          </span>
        </div>
        <div v-if="user.bookings.length > 0" class="divide-y divide-outline-variant">
          <NuxtLink
            v-for="b in user.bookings"
            :key="b.id"
            :to="`/admin/reservas/${b.id}`"
            class="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-container transition-colors"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-on-surface truncate">
                {{ b.origin_label }} → {{ b.destination_address }}
                <Icon v-if="b.offer_id" name="tabler:bolt" size="13" class="inline text-secondary -mt-0.5" />
              </p>
              <p class="text-xs text-on-surface-variant">{{ formatDateTime(b.pickup_at) }}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-sm font-medium text-on-surface">{{ Number(b.total_price).toFixed(2) }} €</span>
              <AppBadge :variant="b.status" :label="statusLabel(b.status)" />
            </div>
          </NuxtLink>
        </div>
        <p v-else class="px-6 py-8 text-center text-sm text-on-surface-variant">Sin reservas todavía</p>
      </div>
    </div>

    <div v-else class="card-surface rounded-xl p-12 text-center">
      <p class="text-on-surface-variant">Usuario no encontrado</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const user = ref<any>(null)
const loading = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

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
    user.value = await $fetch(`/api/admin/usuarios/${route.params.id}`)
  } catch (e) {
    console.error('Error loading user:', e)
  } finally {
    loading.value = false
  }
})
</script>
