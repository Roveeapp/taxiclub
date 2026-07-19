<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mis ofertas</h1>
      <NuxtLink to="/taxista/ofertas/nueva">
        <AppButton :full-width="false">
          <Icon name="tabler:plus" size="16" class="mr-1" />
          Nueva oferta
        </AppButton>
      </NuxtLink>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="card-surface rounded-xl p-6 border border-outline-variant">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="offers.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1400px] w-full">
      <div
        v-for="offer in offers"
        :key="offer.id"
        class="card-surface rounded-xl p-5 border border-outline-variant flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between mb-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-on-surface truncate">{{ offer.origin_address }}</p>
              <p class="text-xs text-on-surface-variant truncate">→ {{ offer.destination_station_name }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span v-if="offer.discount_pct > 0" class="badge-discount">-{{ offer.discount_pct }}%</span>
              <AppBadge
                :variant="getOfferStatus(offer) === 'active' ? 'confirmed' : getOfferStatus(offer) === 'booked' ? 'completed' : getOfferStatus(offer) === 'expired' ? 'pending' : 'cancelled'"
                :label="getOfferStatus(offer) === 'active' ? 'Activa' : getOfferStatus(offer) === 'booked' ? 'Reservada' : getOfferStatus(offer) === 'expired' ? 'Caducada' : offer.status"
              />
            </div>
          </div>

          <div class="flex items-center gap-4 text-xs text-on-surface-variant mb-4">
            <span class="flex items-center gap-1">
              <Icon name="tabler:clock" size="14" />
              {{ formatDateTime(offer.available_from, offer.available_until) }}
            </span>
            <span class="flex items-center gap-1">
              <Icon name="tabler:users" size="14" />
              {{ offer.max_passengers }} plazas
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-outline-variant/30">
          <span class="text-lg font-semibold text-brand-gold">{{ Number(offer.final_price).toFixed(2) }} €</span>
          <div v-if="getOfferStatus(offer) === 'active'" class="flex items-center gap-4">
            <NuxtLink
              :to="`/taxista/ofertas/${offer.id}`"
              class="flex items-center gap-1 text-sm text-brand-gold hover:text-gold-600 transition-colors"
            >
              <Icon name="tabler:pencil" size="14" />
              Editar
            </NuxtLink>
            <button
              class="flex items-center gap-1 text-sm text-error hover:text-red-700 transition-colors"
              @click="handleCancel(offer.id)"
            >
              <Icon name="tabler:x" size="14" />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card-surface rounded-xl p-12 border border-outline-variant text-center max-w-[1400px] w-full">
      <Icon name="tabler:bolt" size="48" class="mx-auto text-gray-200 mb-4" />
      <p class="text-on-surface-variant mb-4">No tienes ofertas activas</p>
      <NuxtLink to="/taxista/ofertas/nueva">
        <AppButton>Crear primera oferta</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const offers = ref<any[]>([])
const loading = ref(true)

function getOfferStatus(offer: any) {
  if (offer.status === 'active') {
    const until = new Date(offer.available_until)
    if (until < new Date()) {
      return 'expired'
    }
  }
  return offer.status
}

function formatDateTime(fromStr: string, untilStr: string) {
  const d1 = new Date(fromStr)
  const d2 = new Date(untilStr)
  const datePart = d1.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const timeFrom = d1.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const timeUntil = d2.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timeFrom} – ${timeUntil}`
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/taxista/ofertas')
    offers.value = data as any[]
  } catch (e) {
    console.error('Error loading offers:', e)
  } finally {
    loading.value = false
  }
})

async function handleCancel(id: string) {
  if (!confirm('¿Cancelar esta oferta?')) return
  try {
    await $fetch(`/api/taxista/ofertas/${id}`, { method: 'DELETE' })
    offers.value = offers.value.filter((o: any) => o.id !== id)
  } catch (e) {
    console.error('Error cancelling offer:', e)
  }
}
</script>
