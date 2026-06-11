<template>
  <div class="pt-6">
    <NuxtLink to="/" class="flex items-center gap-1 text-sm text-white/45 hover:text-white mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver
    </NuxtLink>

    <div class="bg-white rounded-card p-6">
      <h1 class="text-[22px] font-medium text-text-on-light mb-6">Confirmar y pagar</h1>

      <div class="space-y-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="icon-wrap-dark">
            <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
          </div>
          <div>
            <span class="field-label block">DESDE</span>
            <span class="text-sm text-text-on-light">{{ originName }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="icon-wrap-gold">
            <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
          </div>
          <div>
            <span class="field-label block">HASTA</span>
            <span class="text-sm text-text-on-light">{{ bookingData?.destination }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-input rounded-input p-3">
            <span class="field-label block mb-1">FECHA</span>
            <span class="text-sm text-text-on-light">{{ formattedDate }}</span>
          </div>
          <div class="bg-surface-input rounded-input p-3">
            <span class="field-label block mb-1">HORA</span>
            <span class="text-sm text-text-on-light">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 text-sm text-text-muted-light">
          <span class="flex items-center gap-1">
            <Icon name="tabler:users" size="14" />
            {{ bookingData?.passengers }} pasajeros
          </span>
          <span v-if="bookingData?.luggageBig" class="flex items-center gap-1">
            <Icon name="tabler:luggage" size="14" />
            {{ bookingData.luggageBig }} maletas
          </span>
        </div>
      </div>

      <div class="border-t border-surface-divider pt-4 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-text-muted-light">Tarifa base</span>
          <span class="text-text-on-light">{{ formatPrice(priceData?.basePrice) }}</span>
        </div>
        <div v-if="priceData?.extras" class="flex justify-between text-sm mb-2">
          <span class="text-text-muted-light">Extras</span>
          <span class="text-text-on-light">{{ formatPrice(priceData.extras) }}</span>
        </div>
        <div class="flex justify-between text-base font-semibold pt-2 border-t border-surface-divider">
          <span class="text-text-on-light">Total</span>
          <span class="text-brand-gold">{{ formatPrice(priceData?.totalPrice) }}</span>
        </div>
      </div>

      <div class="mb-6">
        <p class="field-label mb-2">DATOS DE PAGO</p>
        <div id="payment-element" class="bg-surface-input rounded-input p-4 min-h-[200px]">
          <p class="text-sm text-text-muted-light text-center py-8">
            Stripe Payment Element se cargará aquí
          </p>
        </div>
      </div>

      <p class="text-xs text-text-muted-light mb-4">
        Al confirmar, Stripe pre-autorizará el pago. El cargo se realizará cuando el taxista complete el viaje.
      </p>

      <AppButton
        variant="gold"
        :loading="processing"
        :disabled="!bookingData"
        @click="handleConfirm"
      >
        Confirmar reserva
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const bookingStore = useBookingStore()
const user = useSupabaseUser()

const processing = ref(false)
const stations = ref<any[]>([])

const bookingData = computed(() => bookingStore.formData)

const priceData = computed(() => bookingStore.currentBooking)

const originName = computed(() => {
  if (!bookingData.value) return ''
  const station = stations.value.find((s: any) => s.id === bookingData.value?.originStationId)
  return station?.name || 'Parada seleccionada'
})

const formattedDate = computed(() => {
  if (!bookingData.value?.date) return ''
  const date = new Date(bookingData.value.date)
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
})

const formattedTime = computed(() => {
  return bookingData.value?.time || ''
})

function formatPrice(price?: number | string) {
  const num = Number(price || 0)
  return `${num.toFixed(2)} €`
}

onMounted(async () => {
  if (!user.value) {
    router.push('/cuenta/login')
    return
  }

  if (!bookingStore.formData) {
    router.push('/')
    return
  }

  try {
    const data = await $fetch('/api/stations')
    stations.value = data as any[]
  } catch (e) {
    console.error('Error loading stations:', e)
  }
})

async function handleConfirm() {
  if (!bookingData.value || !priceData.value) return

  processing.value = true
  try {
    const pickupAt = new Date(`${bookingData.value.date}T${bookingData.value.time}`).toISOString()

    const booking = await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        ...bookingData.value,
        destinationAddress: bookingData.value.destination,
        pickupAt,
        basePrice: priceData.value.basePrice,
        totalPrice: priceData.value.totalPrice,
        stripePaymentIntentId: `pi_mock_${Date.now()}`,
      },
    })

    bookingStore.clearFormData()
    router.push(`/reserva/${(booking as any).id}`)
  } catch (e) {
    console.error('Error creating booking:', e)
  } finally {
    processing.value = false
  }
}
</script>
