<template>
  <div>
    <NuxtLink to="/admin/conductores" class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a conductores
    </NuxtLink>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else-if="driver" class="space-y-6 max-w-3xl">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="tabler:user" size="28" class="text-gray-400" />
          </div>
          <div>
            <h1 class="text-xl font-semibold">{{ driver.full_name }}</h1>
            <p class="text-sm text-gray-500">{{ driver.email }}</p>
            <p v-if="driver.phone" class="text-sm text-gray-500">{{ driver.phone }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-xl p-4">
            <span class="field-label block mb-1">Licencia</span>
            <p class="text-sm font-medium text-gray-900">{{ driver.license_number }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <span class="field-label block mb-1">Ciudad</span>
            <p class="text-sm font-medium text-gray-900">{{ driver.license_city }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <span class="field-label block mb-1">Miembro desde</span>
            <p class="text-sm font-medium text-gray-900">{{ driver.member_since ? formatDate(driver.member_since) : 'N/A' }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <span class="field-label block mb-1">Vehículos</span>
            <p class="text-sm font-medium text-gray-900">{{ driver.vehicle_count || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Configuración</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-gray-700">Miembro del club</span>
            <ToggleSwitch
              v-model="driver.is_member"
              @change="handleUpdate('isMember', driver.is_member)"
            />
          </label>
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-gray-700">Exento de cuota</span>
            <ToggleSwitch
              v-model="driver.is_exempt"
              @change="handleUpdate('isExempt', driver.is_exempt)"
            />
          </label>
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-gray-700">Activo</span>
            <ToggleSwitch
              v-model="driver.is_active"
              @change="handleUpdate('isActive', driver.is_active)"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const driver = ref<any>(null)
const loading = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  try {
    const data = await $fetch(`/api/admin/conductores`)
    const drivers = data as any[]
    driver.value = drivers.find((d: any) => d.id === route.params.id)
  } catch (e) {
    console.error('Error loading driver:', e)
  } finally {
    loading.value = false
  }
})

async function handleUpdate(field: string, value: any) {
  try {
    await $fetch(`/api/admin/conductores/${route.params.id}`, {
      method: 'PATCH',
      body: { [field]: value },
    })
  } catch (e) {
    console.error('Error updating driver:', e)
  }
}
</script>
