<template>
  <div class="min-h-screen bg-background text-on-background overflow-x-hidden">
    <AppHeader />
    <main class="w-full max-w-mobile mx-auto px-md pb-32">
      <!-- Hero -->
      <section class="pt-lg pb-md relative">
        <div class="hero-glow" aria-hidden="true" />
        <p class="text-label-caps text-secondary uppercase tracking-widest mb-1 flex items-center gap-xs">
          <BrandDot />
          Reserva tu viaje
        </p>
        <h2 class="text-display-lg text-on-surface">¿A dónde te llevamos?</h2>
        <p class="text-sm text-on-surface-variant mt-2">Tu taxi de confianza en Asturias, cuando lo necesitas.</p>
      </section>

      <SearchForm :stations="stations" @search="handleSearch" />

      <!-- Confianza -->
      <section class="grid grid-cols-3 gap-sm mt-lg">
        <div v-for="perk in perks" :key="perk.label" class="flex flex-col items-center gap-1 text-center py-sm rounded-input bg-white/[0.04] border border-white/[0.06]">
          <Icon :name="perk.icon" size="18" class="text-secondary" />
          <span class="text-[11px] leading-tight text-on-surface-variant">{{ perk.label }}</span>
        </div>
      </section>

      <!-- Última Hora -->
      <section class="mt-xl space-y-md">
        <div class="flex justify-between items-end">
          <h3 class="text-headline-md text-on-surface flex items-center gap-xs">
            Última Hora
            <BrandDot />
          </h3>
          <NuxtLink to="/ultima-hora" class="text-secondary text-label-caps uppercase tracking-widest hover:opacity-80 transition-opacity">Ver todo</NuxtLink>
        </div>
        <p class="text-[12px] text-on-surface-variant -mt-2">Viajes de retorno con descuento publicados por taxistas</p>

        <div v-if="loadingOffers" class="space-y-sm">
          <AppSkeleton v-for="i in 2" :key="i" />
        </div>

        <div v-else-if="offers.length > 0" class="space-y-sm">
          <NuxtLink
            v-for="offer in offers.slice(0, 2)"
            :key="offer.id"
            :to="`/ultima-hora/${offer.id}`"
            class="block"
          >
            <OfferCard :offer="offer" />
          </NuxtLink>
        </div>

        <div v-else class="text-center py-lg rounded-card border border-dashed border-white/10">
          <Icon name="tabler:bolt" size="28" class="mx-auto text-white/20 mb-2" />
          <p class="text-on-surface-variant text-sm">No hay ofertas disponibles ahora mismo</p>
          <p class="text-white/30 text-xs mt-1">Vuelve más tarde: aparecen cuando un taxista publica un retorno</p>
        </div>
      </section>
    </main>

    <AppToast ref="toastRef" :message="toastMessage" type="error" />
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const bookingStore = useBookingStore()
const router = useRouter()

const stations = ref<Array<{ id: string, name: string }>>([])
const offers = ref<any[]>([])
const loadingOffers = ref(true)
const searching = ref(false)
const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')

const perks = [
  { icon: 'tabler:clock-check', label: 'Confirmación rápida' },
  { icon: 'tabler:shield-check', label: 'Taxistas del club' },
  { icon: 'tabler:credit-card', label: 'Pago seguro' },
]

onMounted(async () => {
  const [stationsResult, offersResult] = await Promise.allSettled([
    $fetch('/api/stations'),
    $fetch('/api/ofertas'),
  ])

  if (stationsResult.status === 'fulfilled') {
    stations.value = stationsResult.value as any[]
  }
  if (offersResult.status === 'fulfilled') {
    offers.value = offersResult.value as any[]
  }

  loadingOffers.value = false
})

async function handleSearch(data: any) {
  if (searching.value) return
  searching.value = true
  bookingStore.setFormData(data)

  try {
    const price = await $fetch('/api/payments/create-intent', {
      method: 'POST',
      body: {
        originStationId: data.originStationId || undefined,
        originAddress: data.originAddress || undefined,
        originLat: data.originLat ?? undefined,
        originLng: data.originLng ?? undefined,
        destination: data.destination,
        // La parada y las coordenadas que el cliente eligió en el buscador. El
        // presupuesto tiene que cotizar con lo mismo que va a guardar la
        // reserva, o enseña un importe y cobra otro.
        destinationStationId: data.destinationStationId || undefined,
        destinationLat: data.destinationLat ?? undefined,
        destinationLng: data.destinationLng ?? undefined,
        passengers: data.passengers,
        luggageBig: data.luggageBig,
        luggageHand: data.luggageHand ?? 0,
        accessoryIds: data.accessoryIds ?? [],
        pickupAt: data.date && data.time ? new Date(`${data.date}T${data.time}`).toISOString() : undefined,
      },
    })
    bookingStore.setCurrentBooking({ ...data, ...(price as Record<string, unknown>) })
    router.push('/pagar')
  } catch (e) {
    console.error('Error calculating price:', e)
    toastMessage.value = 'No hemos podido calcular el precio. Inténtalo de nuevo.'
    toastRef.value?.show()
  } finally {
    searching.value = false
  }
}
</script>

<style scoped>
.hero-glow {
  position: absolute;
  top: -80px;
  right: -60px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250, 189, 50, 0.14) 0%, transparent 65%);
  pointer-events: none;
}
</style>
