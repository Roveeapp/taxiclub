<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Paradas</h1>
      <AppButton :full-width="false" @click="showCreateModal = true">
        <Icon name="tabler:plus" size="16" class="mr-1" />
        Nueva parada
      </AppButton>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="card-surface rounded-xl overflow-hidden">
      <table class="w-full responsive-table">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Nombre</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Ciudad</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Dirección</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Conductores</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">
              Exclusividad
              <Icon name="tabler:eye-off" size="12" class="inline -mt-0.5 ml-1 opacity-60" title="Solo visible para admins" />
            </th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Estado</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="station in stations" :key="station.id" class="hover:bg-surface-container transition-colors">
            <td class="px-6 py-4 mobile-primary" data-label="Nombre">
              <div class="flex items-center gap-2">
                <Icon name="tabler:map-pin" size="16" class="text-brand-gold" />
                <span class="text-sm font-medium text-on-surface">{{ station.name }}</span>
                <span
                  class="md:hidden text-xs px-2 py-0.5 rounded-full ml-auto"
                  :class="station.is_active ? 'bg-success/10 text-success' : 'bg-surface-container-high text-on-surface-variant'"
                >
                  {{ station.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-on-surface-variant" data-label="Ciudad">{{ station.city }}</td>
            <td class="px-6 py-4 text-sm text-on-surface-variant" data-label="Dirección">{{ station.address || '-' }}</td>
            <td class="px-6 py-4 text-sm text-on-surface-variant" data-label="Conductores">{{ station.driver_count || 0 }}</td>
            <td class="px-6 py-4 hidden md:table-cell" data-label="Exclusividad">
              <select
                :value="station.exclusive_driver_id || ''"
                class="excl-select"
                :class="{ 'excl-select-set': station.exclusive_driver_id }"
                @change="setExclusivity(station, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">Sin exclusividad</option>
                <option v-for="d in activeDrivers" :key="d.id" :value="d.id">
                  {{ d.full_name }} ({{ d.license_number }})
                </option>
              </select>
            </td>
            <td class="px-6 py-4 hidden md:table-cell" data-label="Estado">
              <span
                class="text-xs px-2 py-1 rounded-full"
                :class="station.is_active ? 'bg-success/10 text-success' : 'bg-surface-container-high text-on-surface-variant'"
              >
                {{ station.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right mobile-actions" data-label="">
              <button
                class="text-sm text-brand-gold hover:text-gold-600 mr-3"
                @click="editStation(station)"
              >
                Editar
              </button>
              <button
                class="text-sm text-error hover:text-red-400"
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
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="card-surface rounded-xl p-6 max-w-md w-full mx-4 border border-outline-variant">
          <h2 class="text-lg font-semibold text-on-surface mb-4">{{ editingStation ? 'Editar parada' : 'Nueva parada' }}</h2>
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

// Taxistas para el selector de exclusividad
const drivers = ref<any[]>([])
const activeDrivers = computed(() =>
  drivers.value.filter((d: any) => d.is_active && d.is_approved !== false),
)

async function setExclusivity(station: any, driverId: string) {
  const prev = station.exclusive_driver_id
  station.exclusive_driver_id = driverId || null
  try {
    await $fetch(`/api/admin/paradas/${station.id}`, {
      method: 'PATCH',
      body: { exclusiveDriverId: driverId || null },
    })
  } catch (e) {
    station.exclusive_driver_id = prev
    console.error('Error setting exclusivity:', e)
  }
}

onMounted(async () => {
  await loadStations()
  $fetch('/api/admin/conductores')
    .then((data) => { drivers.value = data as any[] })
    .catch((e) => console.error('Error loading drivers:', e))
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

<style scoped>
.excl-select {
  max-width: 190px;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 9px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--on-surface-variant);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.excl-select:focus {
  border-color: var(--secondary);
}
.excl-select-set {
  border-color: rgba(250, 189, 50, 0.6);
  color: var(--secondary);
  font-weight: 500;
}
.excl-select option {
  background: var(--surface-container-low);
  color: var(--on-surface);
}
</style>
