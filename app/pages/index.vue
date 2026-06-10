<template>
  <div class="pt-6">
    <h1 class="text-[28px] font-semibold leading-tight mb-6">
      ¿A dónde te<br />llevamos?
    </h1>
    <SearchForm
      :stations="stations"
      @search="handleSearch"
    />

    <div class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="brand-dot" />
          <h2 class="text-lg font-medium text-white">Última Hora</h2>
        </div>
        <NuxtLink to="/ultima-hora" class="text-sm text-brand-gold hover:text-gold-600 transition-colors">
          Ver todas
        </NuxtLink>
      </div>

      <div v-if="loadingOffers" class="space-y-3">
        <AppSkeleton v-for="i in 2" :key="i" />
      </div>

      <div v-else-if="offers.length > 0" class="space-y-3">
        <NuxtLink
          v-for="offer in offers.slice(0, 3)"
          :key="offer.id"
          :to="`/ultima-hora/${offer.id}`"
        >
          <OfferCard :offer="offer" />
        </NuxtLink>
      </div>

      <div v-else class="text-sm text-white/45">
        No hay ofertas disponibles en este momento
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

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
      body: data,
    })
    bookingStore.setCurrentBooking({ ...data, ...price })
    router.push('/pagar')
  } catch (e) {
    console.error('Error calculating price:', e)
  }
}
</script>
