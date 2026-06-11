<template>
  <div class="pt-6">
    <h1 class="text-[22px] font-medium text-white mb-4">Última Hora</h1>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="bg-white/5 rounded-card p-4">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="offers.length > 0" class="space-y-3">
      <NuxtLink
        v-for="offer in offers"
        :key="offer.id"
        :to="`/ultima-hora/${offer.id}`"
      >
        <OfferCard :offer="offer" />
      </NuxtLink>
    </div>

    <div v-else class="text-center py-12">
      <Icon name="tabler:bolt" size="48" class="mx-auto text-white/20 mb-4" />
      <p class="text-white/45 text-sm">No hay ofertas disponibles en este momento</p>
      <p class="text-white/30 text-xs mt-2">Las ofertas de retorno aparecen aquí cuando un taxista publica un viaje de vuelta</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const offers = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await $fetch('/api/ofertas')
    offers.value = data as any[]
  } catch (e) {
    console.error('Error loading offers:', e)
  } finally {
    loading.value = false
  }
})
</script>
