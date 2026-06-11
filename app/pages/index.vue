<template>
  <div class="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
    <AppHeader />
    <main class="w-full max-w-mobile mx-auto px-md pb-32">
      <section class="space-y-xs">
        <p class="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Reserva tu viaje</p>
        <h2 class="font-display-lg text-display-lg text-on-surface">¿A dónde vamos hoy?</h2>
      </section>

      <SearchForm :stations="stations" @search="handleSearch" />

      <section class="mt-md space-y-md">
        <div class="flex justify-between items-end">
          <h3 class="font-headline-md text-headline-md text-on-surface flex items-center gap-xs">
            Última Hora
            <div class="brand-dot" />
          </h3>
          <NuxtLink to="/ultima-hora" class="text-secondary font-label-caps text-label-caps">VER TODO</NuxtLink>
        </div>

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

        <div v-else class="text-on-surface-variant text-sm text-center py-lg">
          No hay ofertas disponibles en este momento
        </div>
      </section>
    </main>
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const bookingStore = useBookingStore()
const router = useRouter()

const stations = ref<Array<{ id: string; name: string }>>([])
const offers = ref<any[]>([])
const loadingOffers = ref(true)

onMounted(async () => {
  try {
    const [stationsData, offersData] = await Promise.all([
      $fetch('/api/stations'),
      $fetch('/api/ofertas'),
    ])
    stations.value = stationsData as any[]
    offers.value = offersData as any[]
  } catch (e) {
    console.error('Error loading data:', e)
  } finally {
    loadingOffers.value = false
  }
})

async function handleSearch(data: any) {
  bookingStore.setFormData(data)

  try {
    const price = await $fetch('/api/payments/create-intent', {
      method: 'POST',
      body: {
        originStationId: data.originStationId,
        destination: data.destination,
        passengers: data.passengers,
        luggageBig: data.luggageBig,
        luggageHand: 0,
        needsChildSeat: data.accessoryIds?.length > 0,
        needsPetFriendly: false,
        needsAccessible: false,
        needsLargeVehicle: false,
      },
    })
    bookingStore.setCurrentBooking({ ...data, ...price })
    router.push('/pagar')
  } catch (e) {
    console.error('Error calculating price:', e)
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
