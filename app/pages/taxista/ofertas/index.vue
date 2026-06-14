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

    <div v-else-if="offers.length > 0" class="space-y-3">
      <div
        v-for="offer in offers"
        :key="offer.id"
        class="card-surface rounded-xl p-5 border border-outline-variant"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-sm font-medium text-on-surface">{{ offer.origin_address }}</p>
            <p class="text-xs text-on-surface-variant">→ {{ offer.destination_station_name }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="offer.discount_pct > 0" class="badge-discount">-{{ offer.discount_pct }}%</span>
            <AppBadge
              :variant="offer.status === 'active' ? 'confirmed' : offer.status === 'booked' ? 'completed' : 'cancelled'"
              :label="offer.status === 'active' ? 'Activa' : offer.status === 'booked' ? 'Reservada' : offer.status"
            />
          </div>
        </div>

        <div class="flex items-center gap-4 text-xs text-on-surface-variant mb-3">
          <span class="flex items-center gap-1">
            <Icon name="tabler:clock" size="14" />
            {{ formatTime(offer.available_from) }} – {{ formatTime(offer.available_until) }}
          </span>
          <span class="flex items-center gap-1">
            <Icon name="tabler:users" size="14" />
            {{ offer.max_passengers }} plazas
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-lg font-semibold text-brand-gold">{{ Number(offer.final_price).toFixed(2) }} €</span>
          <button
            v-if="offer.status === 'active'"
            class="text-sm text-error hover:text-red-700 transition-colors"
            @click="handleCancel(offer.id)"
          >
            Cancelar oferta
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card-surface rounded-xl p-12 border border-outline-variant text-center">
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

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
