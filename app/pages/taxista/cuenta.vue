<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Mi cuenta</h1>

    <div v-if="user" class="space-y-6 max-w-2xl">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Perfil</h2>
        <div class="space-y-4">
          <div>
            <span class="field-label block mb-1">Nombre</span>
            <p class="text-sm text-gray-900">{{ user.user_metadata?.full_name || 'No especificado' }}</p>
          </div>
          <div>
            <span class="field-label block mb-1">Email</span>
            <p class="text-sm text-gray-900">{{ user.email }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Membresía</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Estado</span>
            <span
              class="text-sm font-medium px-3 py-1 rounded-full"
              :class="driver?.is_member ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'"
            >
              {{ driver?.is_member ? 'Miembro del club' : 'No miembro' }}
            </span>
          </div>
          <div v-if="driver?.member_since" class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Miembro desde</span>
            <span class="text-sm text-gray-900">{{ formatDate(driver.member_since) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500">Comisión</span>
            <span class="text-sm font-medium text-gray-900">{{ driver?.is_member ? '10%' : '12%' }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Mis paradas</h2>
        <div v-if="driverStations.length > 0" class="space-y-2">
          <div
            v-for="station in driverStations"
            :key="station.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-2">
              <Icon name="tabler:map-pin" size="16" class="text-brand-gold" />
              <span class="text-sm text-gray-900">{{ station.name }}</span>
            </div>
            <span class="text-xs text-gray-500">{{ station.city }}</span>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">
          No estás registrado en ninguna parada
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const driver = ref<any>(null)
const driverStations = ref<any[]>([])

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/auth/me')
    driver.value = (data as any)?.driver

    const stations = await $fetch('/api/taxista/paradas')
    driverStations.value = stations as any[]
  } catch (e) {
    console.error('Error loading profile:', e)
  }
})
</script>
