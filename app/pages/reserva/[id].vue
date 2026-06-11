<template>
  <div class="pt-6">
    <div v-if="loading" class="text-center py-12">
      <Icon name="tabler:loader" size="32" class="mx-auto text-white/40 animate-spin mb-4" />
      <p class="text-white/45">Cargando reserva...</p>
    </div>

    <div v-else-if="booking" class="space-y-4">
      <div class="text-center mb-6">
        <BookingStatus :status="booking.status" />
      </div>

      <div class="bg-white rounded-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="icon-wrap-dark">
            <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
          </div>
          <div>
            <span class="field-label block">DESDE</span>
            <span class="text-sm text-text-on-light">{{ booking.origin_station_name }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="icon-wrap-gold">
            <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
          </div>
          <div>
            <span class="field-label block">HASTA</span>
            <span class="text-sm text-text-on-light">{{ booking.destination_address }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-surface-input rounded-input p-3">
            <span class="field-label block mb-1">FECHA</span>
            <span class="text-sm text-text-on-light">{{ formattedDate }}</span>
          </div>
          <div class="bg-surface-input rounded-input p-3">
            <span class="field-label block mb-1">HORA</span>
            <span class="text-sm text-text-on-light">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-surface-divider">
          <span class="text-sm text-text-muted-light">Total</span>
          <span class="text-lg font-semibold text-text-on-light">{{ formattedPrice }}</span>
        </div>
      </div>

      <div v-if="booking.confirmed_plate" class="bg-white rounded-card p-6">
        <PlateDisplay
          :plate="booking.confirmed_plate"
          :phone="booking.confirmed_phone"
        />
      </div>

      <div v-else class="bg-white/5 border border-white/10 rounded-card p-6 text-center">
        <Icon name="tabler:loader" size="24" class="mx-auto text-brand-gold animate-spin mb-2" />
        <p class="text-sm text-white/60">El conductor confirmará en breve</p>
        <p class="text-xs text-white/40 mt-1">Te notificaremos cuando tengamos la matrícula</p>
      </div>

      <div v-if="booking.status !== 'cancelled' && booking.status !== 'completed'" class="space-y-2">
        <AppButton
          variant="secondary"
          @click="handleCancel"
          :loading="cancelling"
        >
          Cancelar reserva
        </AppButton>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <Icon name="tabler:calendar-x" size="48" class="mx-auto text-white/20 mb-4" />
      <p class="text-white/45">Reserva no encontrada</p>
      <NuxtLink to="/" class="text-brand-gold text-sm mt-2 inline-block">Volver al inicio</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()

const booking = ref<any>(null)
const loading = ref(true)
const cancelling = ref(false)

const formattedDate = computed(() => {
  if (!booking.value) return ''
  const date = new Date(booking.value.pickup_at || booking.value.pickupAt)
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
})

const formattedTime = computed(() => {
  if (!booking.value) return ''
  const date = new Date(booking.value.pickup_at || booking.value.pickupAt)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})

const formattedPrice = computed(() => {
  if (!booking.value) return ''
  const price = booking.value.total_price || booking.value.totalPrice
  return `${Number(price).toFixed(2)} €`
})

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

const { booking: realtimeBooking, assignment } = useBookingRealtime(route.params.id as string)

watch(realtimeBooking, (newVal) => {
  if (newVal) {
    booking.value = { ...booking.value, ...newVal }
  }
})

watch(assignment, (newVal) => {
  if (newVal) {
    booking.value = {
      ...booking.value,
      confirmed_plate: newVal.confirmed_plate,
      confirmed_phone: newVal.confirmed_phone,
    }
  }
})

async function handleCancel() {
  if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) return

  cancelling.value = true
  try {
    await $fetch(`/api/bookings/${route.params.id}`, { method: 'DELETE' })
    booking.value = { ...booking.value, status: 'cancelled' }
  } catch (e) {
    console.error('Error cancelling booking:', e)
  } finally {
    cancelling.value = false
  }
}
</script>
