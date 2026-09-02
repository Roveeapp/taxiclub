<template>
  <div class="pt-10 text-center">
    <!-- Éxito -->
    <div class="success-ring mx-auto mb-6">
      <Icon name="tabler:check" size="36" class="text-brand-dark" />
    </div>

    <h1 class="text-[24px] font-semibold text-white mb-2">¡Reserva recibida!</h1>
    <p class="text-sm text-white/50 max-w-[300px] mx-auto mb-8">
      Un taxista del club confirmará tu viaje en breve. Te avisaremos con la matrícula del vehículo.
    </p>

    <div v-if="booking" class="bg-white/5 border border-white/10 rounded-card p-6 text-left space-y-4 mb-6">
      <div class="flex items-center gap-3">
        <div class="icon-wrap-dark">
          <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
        </div>
        <div>
          <span class="field-label block">DESDE</span>
          <span class="text-sm text-white">{{ booking.origin_station_name || booking.origin_address }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="icon-wrap-gold">
          <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
        </div>
        <div>
          <span class="field-label block">HASTA</span>
          <span class="text-sm text-white">{{ booking.destination_address }}</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white/5 rounded-input p-3">
          <span class="field-label block mb-1">RECOGIDA</span>
          <span class="text-sm text-white">{{ formattedPickup }}</span>
        </div>
        <div class="bg-white/5 rounded-input p-3">
          <span class="field-label block mb-1">TOTAL</span>
          <span class="text-sm font-semibold text-brand-gold">{{ formattedPrice }}</span>
        </div>
      </div>
    </div>

    <!-- ¿Viaje de vuelta? -->
    <div v-if="booking && !returnDismissed" class="bg-white/5 border border-secondary/30 rounded-card p-5 text-left mb-6 relative overflow-hidden">
      <div class="return-glow" aria-hidden="true" />
      <div class="flex items-start gap-3 mb-4">
        <div class="icon-wrap-subtle flex-shrink-0">
          <Icon name="tabler:arrows-exchange" size="20" class="text-brand-gold" />
        </div>
        <div>
          <h3 class="text-[15px] font-semibold text-white">¿Reservamos también la vuelta?</h3>
          <p class="text-xs text-white/50 mt-0.5">
            {{ returnOriginLabel }} → {{ returnDestinationLabel }}
          </p>
        </div>
        <button class="ml-auto text-white/40 hover:text-white transition-colors" aria-label="No, gracias" @click="returnDismissed = true">
          <Icon name="tabler:x" size="16" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label class="field-label block mb-1">Fecha de vuelta</label>
          <input v-model="returnDate" type="date" :min="minReturnDate" class="return-input" lang="es">
        </div>
        <div>
          <label class="field-label block mb-1">Hora</label>
          <input v-model="returnTime" type="time" class="return-input">
        </div>
      </div>

      <button
        class="w-full bg-secondary text-on-secondary font-semibold py-3 rounded-btn text-sm active:scale-[0.97] transition-transform disabled:opacity-40"
        :disabled="!returnDate || !returnTime"
        @click="bookReturn"
      >
        Reservar la vuelta
      </button>
    </div>

    <div class="space-y-3">
      <NuxtLink
        :to="`/reserva/${route.params.id}${tokenQuery}`"
        class="block w-full font-semibold py-4 rounded-btn text-sm active:scale-[0.97] transition-transform border border-white/15 text-white hover:border-secondary/60"
      >
        Seguir mi reserva en directo
      </NuxtLink>
      <NuxtLink to="/" class="block text-sm text-white/45 hover:text-white transition-colors py-2">
        Volver al inicio
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const booking = ref<any>(null)

const tokenQuery = computed(() => {
  const params: string[] = []
  if (route.query.token) params.push(`token=${route.query.token}`)
  if (route.query.is_return) params.push(`is_return=${route.query.is_return}`)
  return params.length > 0 ? `?${params.join('&')}` : ''
})

// ── Viaje de vuelta ────────────────────────────────────
const returnDismissed = ref(route.query.is_return === 'true')
const returnDate = ref('')
const returnTime = ref('')

const minReturnDate = computed(() => {
  const pickup = booking.value?.pickup_at ? new Date(booking.value.pickup_at) : new Date()
  return pickup.toISOString().slice(0, 10)
})

const returnOriginLabel = computed(() => booking.value?.destination_address || 'Tu destino')
const returnDestinationLabel = computed(() =>
  booking.value?.origin_station_name || booking.value?.origin_address || 'Tu origen',
)

function bookReturn() {
  if (!booking.value || !returnDate.value || !returnTime.value) return
  // Trayecto invertido: el destino de la ida es el origen de la vuelta
  bookingStore.setFormData({
    originStationId: undefined,
    originAddress: booking.value.destination_address || '',
    destination: returnDestinationLabel.value,
    date: returnDate.value,
    time: returnTime.value,
    passengers: booking.value.passengers || 1,
    luggageBig: booking.value.luggage_big || 0,
    luggageHand: booking.value.luggage_hand || 0,
    accessoryIds: [],
    guestName: booking.value.guest_name || undefined,
    guestEmail: booking.value.guest_email || undefined,
    guestPhone: booking.value.guest_phone || undefined,
  })
  router.push('/pagar?is_return=true')
}

const formattedPickup = computed(() => {
  if (!booking.value?.pickup_at) return ''
  const d = new Date(booking.value.pickup_at)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})

const formattedPrice = computed(() => {
  if (!booking.value) return ''
  return `${Number(booking.value.total_price || 0).toFixed(2)} €`
})

onMounted(async () => {
  try {
    const token = route.query.token ? `?token=${route.query.token}` : ''
    booking.value = await $fetch(`/api/bookings/${route.params.id}${token}`)
  } catch (e) {
    console.error('Error loading booking:', e)
  }
})
</script>

<style scoped>
.success-ring {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgb(var(--secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 0 12px rgba(250, 189, 50, 0.12), 0 0 0 24px rgba(250, 189, 50, 0.05);
}

@keyframes pop {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.return-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250, 189, 50, 0.12) 0%, transparent 65%);
  pointer-events: none;
}

.return-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: #fff;
  outline: none;
  color-scheme: dark;
  transition: border-color 0.15s ease;
}
.return-input:focus {
  border-color: rgb(var(--secondary));
}
</style>
