<template>
  <div>
    <NuxtLink to="/taxista/ofertas" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a ofertas
    </NuxtLink>

    <div v-if="loading" class="card-surface rounded-xl p-6 max-w-xl">
      <AppSkeleton />
    </div>

    <div v-else-if="offer" class="max-w-xl">
      <OfferForm
        :stations="stations"
        :base-price="Number(offer.base_price) || 25"
        :initial-offer="offer"
        @submit="handleSubmit"
      />
    </div>

    <div v-else class="text-center py-12 max-w-xl">
      <Icon name="tabler:bolt-off" size="40" class="mx-auto text-white/20 mb-3" />
      <p class="text-on-surface-variant text-sm">Oferta no encontrada o ya no se puede editar</p>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" type="error" :duration="6000" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()

const offer = ref<any>(null)
const loading = ref(true)
const stations = ref<Array<{ id: string, name: string }>>([])
const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')

onMounted(async () => {
  try {
    const [offerData, stationsData] = await Promise.all([
      $fetch(`/api/taxista/ofertas/${route.params.id}`),
      $fetch('/api/stations'),
    ])
    stations.value = stationsData as any[]
    const o = offerData as any
    // Solo editables las activas
    offer.value = o?.status === 'active' ? o : null
  } catch (e) {
    console.error('Error loading offer:', e)
  } finally {
    loading.value = false
  }
})

async function handleSubmit(data: any) {
  try {
    await $fetch(`/api/taxista/ofertas/${route.params.id}`, {
      method: 'PATCH',
      body: data,
    })
    router.push('/taxista/ofertas')
  } catch (e: any) {
    console.error('Error updating offer:', e)
    toastMessage.value = e?.data?.message || 'No se pudo guardar la oferta'
    toastRef.value?.show()
  }
}
</script>
