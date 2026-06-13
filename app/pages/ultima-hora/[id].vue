<template>
  <div class="pt-6">
    <NuxtLink to="/ultima-hora" class="flex items-center gap-1 text-sm text-white/45 hover:text-white mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a Última Hora
    </NuxtLink>

    <div v-if="loading" class="bg-white/5 rounded-card p-6">
      <AppSkeleton />
    </div>

    <div v-else-if="offer" class="space-y-4">
      <div class="bg-white/5 border border-white/10 rounded-card p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <div class="icon-wrap-dark">
                <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
              </div>
              <span class="text-white font-medium">{{ offer.origin_address || offer.originAddress }}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="icon-wrap-gold">
                <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
              </div>
              <span class="text-white font-medium">{{ offer.destination_station_name || offer.destinationStationName }}</span>
            </div>
          </div>
          <span v-if="(offer.discount_pct ?? offer.discountPct) > 0" class="badge-discount text-sm">
            -{{ offer.discount_pct ?? offer.discountPct }}%
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-white/5 rounded-input p-3">
            <span class="field-label block mb-1">Ventana horaria</span>
            <span class="text-sm text-white">{{ timeWindow }}</span>
          </div>
          <div class="bg-white/5 rounded-input p-3">
            <span class="field-label block mb-1">Plazas</span>
            <span class="text-sm text-white">{{ offer.maxPassengers }} disponibles</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-white/10">
          <div>
            <span v-if="(offer.discount_pct ?? offer.discountPct) > 0" class="text-sm text-white/30 line-through mr-2">
              {{ formattedBasePrice }}
            </span>
            <span class="text-2xl font-semibold text-brand-gold">{{ formattedFinalPrice }}</span>
          </div>
          <OfferTimer :until="offer.available_until || offer.availableUntil" />
        </div>
      </div>

      <div v-if="offer.driver_name || offer.driverName" class="bg-white/5 border border-white/10 rounded-card p-6">
        <p class="text-sm text-white/45 mb-2">Conductor</p>
        <p class="text-base font-medium text-white">{{ offer.driver_name || offer.driverName }}</p>
      </div>

      <AppButton variant="gold" @click="handleBook">
        Reservar esta oferta
      </AppButton>
    </div>

    <div v-else class="text-center py-12">
      <Icon name="tabler:bolt" size="48" class="mx-auto text-white/20 mb-4" />
      <p class="text-white/45">Oferta no disponible</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()

const offer = ref<any>(null)
const loading = ref(true)

const timeWindow = computed(() => {
  if (!offer.value) return ''
  const from = new Date(offer.value.availableFrom || offer.value.available_from)
  const until = new Date(offer.value.availableUntil || offer.value.available_until)
  const fmt = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(from)} – ${fmt(until)}`
})

const formattedBasePrice = computed(() => {
  if (!offer.value) return ''
  const price = offer.value.basePrice || offer.value.base_price
  return `${Number(price).toFixed(2)} €`
})

const formattedFinalPrice = computed(() => {
  if (!offer.value) return ''
  const price = offer.value.finalPrice || offer.value.final_price
  return `${Number(price).toFixed(2)} €`
})

onMounted(async () => {
  try {
    const data = await $fetch(`/api/ofertas/${route.params.id}`)
    offer.value = data
  } catch (e) {
    console.error('Error loading offer:', e)
  } finally {
    loading.value = false
  }
})

function handleBook() {
  router.push(`/pagar?offer=${route.params.id}`)
}
</script>
