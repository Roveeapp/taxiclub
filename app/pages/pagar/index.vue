<template>
  <div class="pt-6">
    <NuxtLink to="/" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver
    </NuxtLink>

    <div class="card-surface rounded-xl p-6">
      <h1 class="text-[22px] font-medium text-on-surface mb-6">Confirmar y pagar</h1>

      <div class="space-y-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="icon-wrap-dark bg-surface-container rounded-full p-2">
            <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
          </div>
          <div>
            <span class="field-label block text-on-surface-variant">DESDE</span>
            <span class="text-sm text-on-surface">{{ originName }}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="icon-wrap-gold bg-brand-gold rounded-full p-2">
            <Icon name="tabler:map-pin" size="14" class="text-on-secondary" />
          </div>
          <div>
            <span class="field-label block text-on-surface-variant">HASTA</span>
            <span class="text-sm text-on-surface">{{ bookingData?.destination }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-container rounded-xl p-3">
            <span class="field-label block mb-1 text-on-surface-variant">FECHA</span>
            <span class="text-sm text-on-surface">{{ formattedDate }}</span>
          </div>
          <div class="bg-surface-container rounded-xl p-3">
            <span class="field-label block mb-1 text-on-surface-variant">HORA</span>
            <span class="text-sm text-on-surface">{{ formattedTime }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4 text-sm text-on-surface-variant">
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

      <div class="border-t border-outline-variant pt-4 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-on-surface-variant">Tarifa base</span>
          <span class="text-on-surface">{{ formatPrice(priceData?.basePrice) }}</span>
        </div>
        <div v-if="priceData?.extras" class="flex justify-between text-sm mb-2">
          <span class="text-on-surface-variant">Extras</span>
          <span class="text-on-surface">{{ formatPrice(priceData.extras) }}</span>
        </div>
        <div class="flex justify-between text-base font-semibold pt-2 border-t border-outline-variant">
          <span class="text-on-surface">Total</span>
          <span class="text-brand-gold">{{ formatPrice(priceData?.totalPrice) }}</span>
        </div>
      </div>

      <div v-if="!user" class="mb-6">
        <p class="field-label mb-4 text-on-surface-variant">DATOS DEL PASAJERO</p>
        <div class="space-y-4">
          <AppInput
            v-model="guestData.name"
            label="Nombre completo"
            placeholder="Ej. Juan Pérez"
          />
          <AppInput
            v-model="guestData.email"
            type="email"
            label="Correo electrónico"
            placeholder="Para enviarte el recibo"
          />
          <AppInput
            v-model="guestData.phone"
            type="tel"
            label="Teléfono móvil"
            placeholder="Para que el taxista pueda contactarte"
          />
        </div>

        <div class="mt-6">
          <div class="flex items-center gap-2 mb-4">
            <Checkbox v-model="createAccount" input-id="createAccount" binary />
            <label for="createAccount" class="text-sm text-on-surface cursor-pointer">
              Crear una cuenta para gestionar mis reservas
            </label>
          </div>
          
          <div v-if="createAccount" class="animate-fade-in">
            <AppInput
              v-model="guestData.password"
              type="password"
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
      </div>

      <div class="mb-6">
        <p class="field-label mb-2 text-on-surface-variant">DATOS DE PAGO</p>
        <div id="payment-element" class="bg-surface-container rounded-xl p-4 min-h-[200px]">
          <p class="text-sm text-on-surface-variant text-center py-8">
            Stripe Payment Element se cargará aquí
          </p>
        </div>
      </div>

      <p class="text-xs text-on-surface-variant mb-4">
        Al confirmar, Stripe pre-autorizará el pago. El cargo se realizará cuando el taxista complete el viaje.
      </p>

      <AppButton
        variant="gold"
        :loading="processing"
        :disabled="!bookingData || (!user && (!guestData.name || !guestData.email || !guestData.phone || (createAccount && !guestData.password)))"
        @click="handleConfirm"
      >
        Confirmar reserva
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import Checkbox from 'primevue/checkbox'

definePageMeta({ layout: 'default' })

interface Station {
  id: string
  name: string
}

interface BookingResponse {
  id: string
}

const router = useRouter()
const bookingStore = useBookingStore()
const user = useSupabaseUser()

const processing = ref(false)
const stations = ref<Station[]>([])
const createAccount = ref(false)

const guestData = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
})

const bookingData = computed(() => bookingStore.formData)

const priceData = computed(() => bookingStore.currentBooking)

const originName = computed(() => {
  if (!bookingData.value) return ''
  const station = stations.value.find((s: Station) => s.id === bookingData.value?.originStationId)
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
  if (!bookingStore.formData) {
    router.push('/')
    return
  }

  try {
    const data = await $fetch('/api/stations')
    stations.value = data as Station[]
  } catch (e) {
    console.error('Error loading stations:', e)
  }
})

async function handleConfirm() {
  if (!bookingData.value || !priceData.value) return

  processing.value = true

  try {
    if (!user.value && createAccount.value && guestData.password) {
      const { signUp } = useAuth()
      await signUp(guestData.email, guestData.password, 'client', guestData.name, guestData.phone)
      
      // Wait a moment for session to propagate
      await new Promise(resolve => setTimeout(resolve, 800))
    }

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
        guestName: !user.value ? guestData.name : undefined,
        guestEmail: !user.value ? guestData.email : undefined,
        guestPhone: !user.value ? guestData.phone : undefined,
      },
    })

    bookingStore.clearFormData()
    router.push(`/reserva/${(booking as BookingResponse).id}`)
  } catch (e) {
    console.error('Error creating booking:', e)
  } finally {
    processing.value = false
  }
}
</script>
