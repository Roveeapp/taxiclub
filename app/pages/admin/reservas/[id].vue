<template>
  <div>
    <NuxtLink to="/admin/reservas" class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a reservas
    </NuxtLink>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else-if="booking" class="space-y-6 max-w-3xl">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold">Reserva #{{ booking.id?.slice(0, 8) }}</h1>
          <AppBadge
            :variant="booking.status"
            :label="statusLabel(booking.status)"
          />
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="icon-wrap-dark">
              <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
            </div>
            <div>
              <span class="field-label block">ORIGEN</span>
              <span class="text-sm font-medium text-gray-900">{{ booking.origin_station_name }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="icon-wrap-gold">
              <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
            </div>
            <div>
              <span class="field-label block">DESTINO</span>
              <span class="text-sm font-medium text-gray-900">{{ booking.destination_address }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <span class="field-label block mb-1">FECHA/HORA</span>
              <span class="text-sm font-medium text-gray-900">{{ formatDateTime(booking.pickup_at) }}</span>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <span class="field-label block mb-1">PRECIO</span>
              <span class="text-sm font-medium text-gray-900">{{ Number(booking.total_price).toFixed(2) }} €</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Cliente</h2>
        <div class="space-y-2">
          <p class="text-sm text-gray-900">{{ booking.client_name || 'Sin nombre' }}</p>
          <p class="text-sm text-gray-500">{{ booking.client_email || 'Sin email' }}</p>
        </div>
      </div>

      <div v-if="booking.driver_id" class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Conductor asignado</h2>
        <div class="space-y-2">
          <p class="text-sm text-gray-900">ID: {{ booking.driver_id?.slice(0, 8) }}...</p>
          <p v-if="booking.confirmed_plate" class="text-sm text-gray-900">
            Matrícula: <span class="font-medium">{{ booking.confirmed_plate }}</span>
          </p>
          <p v-if="booking.confirmed_phone" class="text-sm text-gray-900">
            Teléfono: <span class="font-medium">{{ booking.confirmed_phone }}</span>
          </p>
        </div>
      </div>

      <div v-if="booking.status !== 'cancelled' && booking.status !== 'completed'" class="flex gap-3">
        <AppButton
          variant="secondary"
          @click="handleCancel"
          :loading="cancelling"
        >
          Cancelar reserva
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const booking = ref<any>(null)
const loading = ref(true)
const cancelling = ref(false)

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
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' a las ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const data = await $fetch(`/api/bookings/${route.params.id}`)
    booking.value = data
  } catch (e) {
    console.error('Error loading booking:', e)
  } finally {
    loading.value = false
  }
})

async function handleCancel() {
  if (!confirm('¿Cancelar esta reserva? Se liberará el pago.')) return
  cancelling.value = true
  try {
    await $fetch(`/api/admin/reservas/${route.params.id}/cancelar`, {
      method: 'POST',
      body: { reason: 'Cancelada por administrador' },
    })
    booking.value = { ...booking.value, status: 'cancelled' }
  } catch (e) {
    console.error('Error cancelling booking:', e)
  } finally {
    cancelling.value = false
  }
}
</script>
