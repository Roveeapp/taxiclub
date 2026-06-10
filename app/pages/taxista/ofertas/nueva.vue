<template>
  <div>
    <NuxtLink to="/taxista/ofertas" class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
      <Icon name="ti:chevron-left" size="16" />
      Volver a ofertas
    </NuxtLink>

    <div class="max-w-xl">
      <OfferForm
        :stations="stations"
        :base-price="25"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const router = useRouter()
const stations = ref<Array<{ id: string; name: string }>>([])

onMounted(async () => {
  try {
    const data = await $fetch('/api/stations')
    stations.value = data as any[]
  } catch (e) {
    console.error('Error loading stations:', e)
  }
})

async function handleSubmit(data: any) {
  try {
    await $fetch('/api/taxista/ofertas', {
      method: 'POST',
      body: data,
    })
    router.push('/taxista/ofertas')
  } catch (e) {
    console.error('Error creating offer:', e)
  }
}
</script>
