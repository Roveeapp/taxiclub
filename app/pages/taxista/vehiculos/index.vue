<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mis vehículos</h1>
      <NuxtLink to="/taxista/vehiculos/nuevo">
        <AppButton :full-width="false">
          <Icon name="tabler:plus" size="16" class="mr-1" />
          Añadir vehículo
        </AppButton>
      </NuxtLink>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 2" :key="i" class="card-surface rounded-xl p-6 border border-outline-variant">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="vehicles.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <VehicleCard
        v-for="vehicle in vehicles"
        :key="vehicle.id"
        :vehicle="vehicle"
        @deactivate="handleDeactivate"
      />
    </div>

    <div v-else class="card-surface rounded-xl p-12 border border-outline-variant text-center">
      <Icon name="tabler:steering-wheel" size="48" class="mx-auto text-on-surface mb-4" />
      <p class="text-on-surface-variant mb-4">No tienes vehículos registrados</p>
      <NuxtLink to="/taxista/vehiculos/nuevo">
        <AppButton>Añadir primer vehículo</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { confirmar } = useConfirmacion()

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const vehicles = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await $fetch('/api/taxista/vehiculos')
    vehicles.value = data as any[]
  } catch (e) {
    console.error('Error loading vehicles:', e)
  } finally {
    loading.value = false
  }
})

async function handleDeactivate(id: string) {
  if (!await confirmar({
    titulo: 'Desactivar el vehículo',
    mensaje: 'Dejará de usarse para asignarte reservas. Puedes volver a activarlo cuando quieras.',
    textoConfirmar: 'Desactivar',
    destructivo: true,
  })) return
  try {
    await $fetch(`/api/taxista/vehiculos/${id}`, { method: 'DELETE' })
    vehicles.value = vehicles.value.filter((v: any) => v.id !== id)
  } catch (e) {
    console.error('Error deactivating vehicle:', e)
  }
}
</script>
