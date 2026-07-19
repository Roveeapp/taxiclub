<template>
  <div class="pt-6">
    <NuxtLink to="/" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver
    </NuxtLink>

    <div class="card-surface rounded-card p-6">
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
            {{ bookingData?.passengers }} {{ bookingData?.passengers === 1 ? 'pasajero' : 'pasajeros' }}
          </span>
          <span v-if="bookingData?.luggageBig" class="flex items-center gap-1">
            <Icon name="tabler:luggage" size="14" />
            {{ bookingData.luggageBig }} {{ bookingData.luggageBig === 1 ? 'maleta' : 'maletas' }}
          </span>
        </div>
      </div>

      <div class="border-t border-outline-variant pt-4 mb-6">
        <!-- Desglose de oferta con señal -->
        <template v-if="offerAmounts">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-on-surface-variant">Precio del viaje</span>
            <span class="text-on-surface">{{ formatPrice(offerAmounts.finalPrice) }}</span>
          </div>
          <div class="flex justify-between text-base font-semibold pt-2 border-t border-outline-variant mb-1">
            <span class="text-on-surface">Señal ahora (10%)</span>
            <span class="text-brand-gold">{{ formatPrice(offerAmounts.deposit) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-on-surface-variant">Resto al taxista al final del viaje</span>
            <span class="text-on-surface-variant">{{ formatPrice(offerAmounts.remainder) }}</span>
          </div>
        </template>

        <!-- Desglose normal -->
        <template v-else>
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
        </template>
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
        <div class="bg-surface-container rounded-xl p-4 min-h-[100px]">
          <div id="payment-element" />
          <div v-if="paymentUiState === 'loading'" class="text-center py-6">
            <Icon name="tabler:loader" size="22" class="mx-auto text-brand-gold animate-spin mb-2" />
            <p class="text-xs text-on-surface-variant">Cargando pasarela de pago segura…</p>
          </div>
          <p v-else-if="paymentUiState === 'unavailable'" class="text-sm text-on-surface-variant text-center py-6">
            La pasarela de pago no está disponible ahora mismo.<br>
            <span class="text-xs">Tu reserva se creará y podrás pagar al taxista.</span>
          </p>
        </div>
      </div>

      <p class="text-xs text-on-surface-variant mb-4">
        <template v-if="offerAmounts">
          Al confirmar, Stripe pre-autorizará la señal del 10%. Se cargará al completarse el viaje y el resto se lo pagas al taxista directamente.
        </template>
        <template v-else>
          Al confirmar, Stripe pre-autorizará el pago. El cargo se realizará cuando el taxista complete el viaje.
        </template>
      </p>

      <AppButton
        variant="gold"
        full-width
        :loading="processing"
        :disabled="!bookingData || (!user && (!guestData.name || !guestData.email || !guestData.phone || (createAccount && !guestData.password)))"
        @click="handleConfirm"
      >
        Confirmar reserva
      </AppButton>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" type="error" :duration="6000" />
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
const route = useRoute()
const bookingStore = useBookingStore()
const user = useSupabaseUser()
const runtimeConfig = useRuntimeConfig()
const { config: systemConfig, load: loadSystemConfig } = useSystemConfig()

// Publishable key: panel admin (vía /api/config) > .env
const stripePk = computed(() =>
  (systemConfig.value?.stripe_publishable_key as string)
  || (runtimeConfig.public.stripePublishableKey as string)
  || '',
)

// Modo oferta de Última Hora (señal del 10%)
const offerId = computed(() => route.query.offer as string | undefined)
const offer = ref<any>(null)
const offerAmounts = ref<{ finalPrice: number, deposit: number, remainder: number } | null>(null)

const processing = ref(false)
const stations = ref<Station[]>([])
const createAccount = ref(false)
const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')

// Stripe
const paymentUiState = ref<'loading' | 'ready' | 'unavailable'>('loading')
let stripe: any = null
let elements: any = null
let clientSecret: string | null = null
let paymentIntentId: string | null = null

const guestData = reactive({
  name: bookingStore.formData?.guestName || '',
  email: bookingStore.formData?.guestEmail || '',
  phone: bookingStore.formData?.guestPhone || '',
  password: '',
})

const bookingData = computed(() => {
  // En modo oferta sintetizamos los datos desde la oferta
  if (offer.value) {
    const pickup = new Date(offer.value.available_from)
    return {
      originAddress: offer.value.origin_address,
      destination: destinationStationName.value,
      date: pickup.toISOString().slice(0, 10),
      time: pickup.toTimeString().slice(0, 5),
      passengers: 1,
      luggageBig: 0,
      luggageHand: 0,
    } as any
  }
  return bookingStore.formData
})

const priceData = computed(() => {
  if (offerAmounts.value) {
    return {
      basePrice: offerAmounts.value.finalPrice,
      extras: 0,
      totalPrice: offerAmounts.value.finalPrice,
    } as any
  }
  return bookingStore.currentBooking
})

const destinationStationName = computed(() => {
  if (!offer.value) return ''
  const station = stations.value.find((s: Station) => s.id === offer.value.destination_station_id)
  return station?.name || 'Parada de destino'
})

const originName = computed(() => {
  if (offer.value) return offer.value.origin_address
  if (!bookingData.value) return ''
  const station = stations.value.find((s: Station) => s.id === bookingData.value?.originStationId)
  return station?.name || (bookingData.value as any).originAddress || 'Origen seleccionado'
})

const formattedDate = computed(() => {
  if (!bookingData.value?.date) return ''
  const date = new Date(bookingData.value.date)
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
})

const formattedTime = computed(() => bookingData.value?.time || '')

function formatPrice(price?: number | string) {
  const num = Number(price || 0)
  return `${num.toFixed(2)} €`
}

function showError(message: string) {
  toastMessage.value = message
  toastRef.value?.show()
}

function loadStripeJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Stripe) return resolve((window as any).Stripe)
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.onload = () => resolve((window as any).Stripe)
    script.onerror = () => reject(new Error('No se pudo cargar Stripe.js'))
    document.head.appendChild(script)
  })
}

async function initPayment() {
  const pk = stripePk.value
  if (!pk || !bookingData.value) {
    paymentUiState.value = 'unavailable'
    return
  }

  try {
    // Modo oferta: pre-autorizamos solo la señal del 10%
    if (offerId.value) {
      const intent: any = await $fetch(`/api/ofertas/${offerId.value}/intent`, { method: 'POST' })
      offerAmounts.value = {
        finalPrice: intent.finalPrice,
        deposit: intent.deposit,
        remainder: intent.remainder,
      }
      if (!intent.clientSecret) {
        paymentUiState.value = 'unavailable'
        return
      }
      clientSecret = intent.clientSecret
      paymentIntentId = intent.paymentIntentId
      await mountStripeElements(pk)
      return
    }

    const data = bookingData.value as Record<string, any>
    const intent: any = await $fetch('/api/payments/create-intent', {
      method: 'POST',
      body: {
        originStationId: data.originStationId || undefined,
        originAddress: data.originAddress || undefined,
        destination: data.destination,
        passengers: data.passengers,
        luggageBig: data.luggageBig,
        luggageHand: data.luggageHand ?? 0,
        accessoryIds: data.accessoryIds ?? [],
        pickupAt: data.date && data.time ? new Date(`${data.date}T${data.time}`).toISOString() : undefined,
        createIntent: true,
      },
    })

    // Refresca el precio (por si el usuario recargó la página)
    bookingStore.setCurrentBooking({ ...data, ...intent })

    if (!intent.clientSecret) {
      paymentUiState.value = 'unavailable'
      return
    }

    clientSecret = intent.clientSecret
    paymentIntentId = intent.paymentIntentId
    await mountStripeElements(pk)
  } catch (e) {
    console.error('Error initializing Stripe:', e)
    paymentUiState.value = 'unavailable'
  }
}

async function mountStripeElements(pk: string) {
  const Stripe = await loadStripeJs()
  stripe = Stripe(pk)
  elements = stripe.elements({
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#fabd32',
        colorBackground: '#1f1f29',
        colorText: '#e4e1ef',
        borderRadius: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
  })
  const paymentElement = elements.create('payment', { layout: 'tabs' })
  paymentElement.mount('#payment-element')
  paymentUiState.value = 'ready'
}

onMounted(async () => {
  if (!bookingStore.formData && !offerId.value) {
    router.push('/')
    return
  }

  await loadSystemConfig()

  try {
    stations.value = await $fetch('/api/stations') as Station[]
  } catch (e) {
    console.error('Error loading stations:', e)
  }

  // Modo oferta: cargar la oferta para el resumen
  if (offerId.value) {
    try {
      offer.value = await $fetch(`/api/ofertas/${offerId.value}`)
    } catch (e) {
      console.error('Error loading offer:', e)
      showError('Esta oferta ya no está disponible')
      router.push('/ultima-hora')
      return
    }
  }

  await initPayment()
})

async function handleConfirm() {
  if (!bookingData.value || !priceData.value) return

  processing.value = true

  try {
    // 1. Crear cuenta si el invitado lo pidió
    if (!user.value && createAccount.value && guestData.password) {
      const { signUp } = useAuth()
      try {
        await signUp(guestData.email, guestData.password, 'client', guestData.name, guestData.phone)
        await new Promise(resolve => setTimeout(resolve, 800))
      } catch (e) {
        console.error('Error creating account:', e)
        showError('No se pudo crear la cuenta. Revisa el correo y la contraseña.')
        return
      }
    }

    // 2. Pre-autorizar el pago con Stripe (si la pasarela está activa)
    let intentIdForBooking = `pi_mock_${Date.now()}`
    if (paymentUiState.value === 'ready' && stripe && elements) {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        showError(submitError.message || 'Revisa los datos de pago.')
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: user.value?.user_metadata?.full_name || guestData.name || undefined,
              email: user.value?.email || guestData.email || undefined,
              phone: guestData.phone || undefined,
            },
          },
        },
      })

      if (error) {
        showError(error.message || 'El pago ha sido rechazado. Prueba con otra tarjeta.')
        return
      }

      const okStatuses = ['requires_capture', 'processing', 'succeeded']
      if (!paymentIntent || !okStatuses.includes(paymentIntent.status)) {
        showError('No se pudo completar la pre-autorización del pago.')
        return
      }
      intentIdForBooking = paymentIntent.id || paymentIntentId || intentIdForBooking
    }

    // 3a. Modo oferta: reservar la oferta con la señal pre-autorizada
    if (offerId.value) {
      const booking: any = await $fetch(`/api/ofertas/${offerId.value}/reservar`, {
        method: 'POST',
        body: {
          stripePaymentIntentId: intentIdForBooking,
          destinationName: destinationStationName.value,
          guestName: !user.value ? guestData.name : undefined,
          guestEmail: !user.value ? guestData.email : undefined,
          guestPhone: !user.value ? guestData.phone : undefined,
        },
      })
      const isReturn = route.query.is_return === 'true'
      const isReturnQuery = isReturn ? '&is_return=true' : ''
      const tokenQuery = booking.guest_token ? `?token=${booking.guest_token}${isReturnQuery}` : (isReturn ? `?is_return=true` : '')
      router.push(`/reserva/confirmacion/${booking.id}${tokenQuery}`)
      return
    }

    // 3b. Crear la reserva normal
    const pickupAt = new Date(`${bookingData.value.date}T${bookingData.value.time}`).toISOString()

    const booking = await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        ...bookingData.value,
        destinationAddress: bookingData.value.destination,
        pickupAt,
        basePrice: priceData.value.basePrice,
        totalPrice: priceData.value.totalPrice,
        stripePaymentIntentId: intentIdForBooking,
        guestName: !user.value ? guestData.name : undefined,
        guestEmail: !user.value ? guestData.email : undefined,
        guestPhone: !user.value ? guestData.phone : undefined,
      },
    })

    bookingStore.clearFormData()
    const b = booking as BookingResponse & { guest_token?: string }
    const isReturn = route.query.is_return === 'true'
    const isReturnQuery = isReturn ? '&is_return=true' : ''
    const tokenQuery = b.guest_token ? `?token=${b.guest_token}${isReturnQuery}` : (isReturn ? `?is_return=true` : '')
    router.push(`/reserva/confirmacion/${b.id}${tokenQuery}`)
  } catch (e) {
    console.error('Error creating booking:', e)
    showError('No se pudo crear la reserva. Inténtalo de nuevo en unos segundos.')
  } finally {
    processing.value = false
  }
}
</script>
