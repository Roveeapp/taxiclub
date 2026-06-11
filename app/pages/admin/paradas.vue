<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Paradas</h1>
      <AppButton @click="showCreateModal = true">
        <Icon name="tabler:plus" size="16" class="mr-1" />
        Nueva parada
      </AppButton>
    </div>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Nombre</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Ciudad</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Dirección</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Conductores</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Estado</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="station in stations" :key="station.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <Icon name="tabler:map-pin" size="16" class="text-brand-gold" />
                <span class="text-sm font-medium text-gray-900">{{ station.name }}</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ station.city }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ station.address || '-' }}</td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ station.driver_count || 0 }}</td>
            <td class="px-6 py-4">
              <span
                class="text-xs px-2 py-1 rounded-full"
                :class="station.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'"
              >
                {{ station.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button
                class="text-sm text-brand-gold hover:text-gold-600 mr-3"
                @click="editStation(station)"
              >
                Editar
              </button>
              <button
                class="text-sm text-error hover:text-red-700"
                @click="toggleActive(station)"
              >
                {{ station.is_active ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h2 class="text-lg font-semibold mb-4">{{ editingStation ? 'Editar parada' : 'Nueva parada' }}</h2>
          <div class="space-y-4">
            <AppInput v-model="form.name" label="Nombre" placeholder="Ej: Aeropuerto de Asturias" />
            <AppInput v-model="form.city" label="Ciudad" placeholder="Ej: Castrillón" />
            <AppInput v-model="form.address" label="Dirección" placeholder="Ej: AS-19, 33459" />
            <div class="grid grid-cols-2 gap-4">
              <AppInput v-model="form.lat" label="Latitud" type="number" step="0.000001" />
              <AppInput v-model="form.lng" label="Longitud" type="number" step="0.000001" />
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <AppButton variant="secondary" @click="closeModal">Cancelar</AppButton>
            <AppButton @click="handleSave" :loading="saving">
              {{ editingStation ? 'Guardar' : 'Crear' }}
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const stations = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const editingStation = ref<any>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  city: '',
  address: '',
  lat: '',
  lng: '',
})

onMounted(async () => {
  await loadStations()
})

async function loadStations() {
  loading.value = true
  try {
    const data = await $fetch('/api/admin/paradas')
    stations.value = data as any[]
  } catch (e) {
    console.error('Error loading stations:', e)
  } finally {
    loading.value = false
  }
}

function editStation(station: any) {
  editingStation.value = station
  form.name = station.name
  form.city = station.city
  form.address = station.address || ''
  form.lat = station.lat?.toString() || ''
  form.lng = station.lng?.toString() || ''
  showCreateModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  editingStation.value = null
  form.name = ''
  form.city = ''
  form.address = ''
  form.lat = ''
  form.lng = ''
}

async function handleSave() {
  saving.value = true
  try {
    if (editingStation.value) {
      await $fetch(`/api/admin/paradas/${editingStation.value.id}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          city: form.city,
          address: form.address,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
        },
      })
    } else {
      await $fetch('/api/admin/paradas', {
        method: 'POST',
        body: {
          name: form.name,
          city: form.city,
          address: form.address,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
        },
      })
    }
    closeModal()
    await loadStations()
  } catch (e) {
    console.error('Error saving station:', e)
  } finally {
    saving.value = false
  }
}

async function toggleActive(station: any) {
  try {
    await $fetch(`/api/admin/paradas/${station.id}`, {
      method: 'PATCH',
      body: { isActive: !station.is_active },
    })
    station.is_active = !station.is_active
  } catch (e) {
    console.error('Error toggling station:', e)
  }
}
</script>
