<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Mi cuenta</h1>

    <div v-if="user" class="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-[1400px]">
      <div class="space-y-6">
        <div class="card-surface rounded-xl p-6 border border-outline-variant">
          <h2 class="text-lg font-medium mb-4">Perfil</h2>
          <div class="space-y-4">
            <div>
              <label class="field-label block mb-1">Nombre y Apellidos</label>
              <input v-model="profileForm.fullName" type="text" placeholder="Ej: Iván Menéndez" class="profile-input">
            </div>
            <div>
              <label class="field-label block mb-1">Teléfono</label>
              <input v-model="profileForm.phone" type="text" placeholder="Ej: +34 666 555 444" class="profile-input">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="field-label block mb-1">Número de Licencia</label>
                <input v-model="profileForm.licenseNumber" type="text" placeholder="Ej: 1234" class="profile-input">
              </div>
              <div>
                <label class="field-label block mb-1">Ciudad de Licencia</label>
                <input v-model="profileForm.licenseCity" type="text" placeholder="Ej: Oviedo" class="profile-input">
              </div>
            </div>
            <div>
              <span class="field-label block mb-1">Email (No editable)</span>
              <input :value="user.email" type="text" disabled class="profile-input">
            </div>
            <div class="pt-2 flex items-center gap-3">
              <AppButton :loading="savingProfile" @click="saveProfile">Guardar perfil</AppButton>
              <Transition name="fade">
                <p v-if="profileMessage" class="text-xs" :class="profileOk ? 'text-success' : 'text-error'">{{ profileMessage }}</p>
              </Transition>
            </div>
          </div>
        </div>

        <div class="card-surface rounded-xl p-6 border border-outline-variant">
          <h2 class="text-lg font-medium mb-4">Membresía</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-on-surface-variant">Estado</span>
              <span
                class="text-sm font-medium px-3 py-1 rounded-full"
                :class="driver?.is_member ? 'bg-success/10 text-success' : 'bg-gray-100 text-on-surface-variant'"
              >
                {{ driver?.is_member ? 'Miembro del club' : 'No miembro' }}
              </span>
            </div>
            <div v-if="driver?.member_since" class="flex items-center justify-between">
              <span class="text-sm text-on-surface-variant">Miembro desde</span>
              <span class="text-sm text-on-surface">{{ formatDate(driver.member_since) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-on-surface-variant">Comisión</span>
              <span class="text-sm font-medium text-on-surface">{{ driver?.is_member ? '10%' : '12%' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="card-surface rounded-xl p-6 border border-outline-variant">
          <h2 class="text-lg font-medium mb-1">Mi tarifa por kilómetro</h2>
          <p class="text-xs text-on-surface-variant mb-4">
            Se usa para calcular el precio de tus reservas cuando la ruta no tiene precio fijo.
            Vacío = tarifa global de la plataforma ({{ globalPerKm }} €/km).
          </p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1 max-w-[220px]">
              <input
                v-model="pricePerKm"
                type="number"
                min="0.1"
                max="100"
                step="0.05"
                :placeholder="`Global: ${globalPerKm}`"
                class="rate-input"
              >
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">€/km</span>
            </div>
            <AppButton :loading="savingRate" @click="saveRate">Guardar</AppButton>
            <button
              v-if="pricePerKm !== ''"
              class="text-sm text-on-surface-variant hover:text-on-surface"
              @click="clearRate"
            >
              Usar la global
            </button>
          </div>
          <Transition name="fade">
            <p v-if="rateMessage" class="text-xs mt-2" :class="rateOk ? 'text-success' : 'text-error'">{{ rateMessage }}</p>
          </Transition>
          <p v-if="pricePerKm !== ''" class="text-[11px] text-brand-gold mt-2">
            Tarifa propia activa — prevalece sobre la global
          </p>
        </div>

        <div class="card-surface rounded-xl p-6 border border-outline-variant">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 class="text-lg font-medium">Mis paradas</h2>
            <div v-if="availableStations.length > 0" class="flex items-center gap-2">
              <select v-model="selectedStationToAdd" class="station-select">
                <option value="" disabled>Añadir parada...</option>
                <option v-for="s in availableStations" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.city }})
                </option>
              </select>
              <button
                class="add-station-btn"
                :disabled="!selectedStationToAdd || addingStation"
                @click="addStation"
              >
                <Icon v-if="addingStation" name="tabler:loader" class="animate-spin" size="16" />
                <Icon v-else name="tabler:plus" size="16" />
              </button>
            </div>
          </div>
          <div v-if="driverStations.length > 0" class="space-y-2">
            <div
              v-for="station in driverStations"
              :key="station.id"
              class="flex items-center justify-between p-3 bg-surface-container rounded-lg border border-outline-variant/30 hover:border-outline-variant transition-colors"
            >
              <div class="flex items-center gap-2">
                <Icon name="tabler:map-pin" size="16" class="text-brand-gold" />
                <div>
                  <span class="text-sm font-medium text-on-surface">{{ station.name }}</span>
                  <p class="text-[11px] text-on-surface-variant">{{ station.city }}</p>
                </div>
              </div>
              <button
                class="remove-station-btn"
                title="Quitar parada"
                :disabled="removingStationId === station.id"
                @click="removeStation(station.id)"
              >
                <Icon v-if="removingStationId === station.id" name="tabler:loader" class="animate-spin" size="15" />
                <Icon v-else name="tabler:trash" size="15" />
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-on-surface-variant py-4 text-center border border-dashed border-outline-variant/50 rounded-lg">
            No estás registrado en ninguna parada
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const driver = ref<any>(null)
const driverStations = ref<any[]>([])
const allStations = ref<any[]>([])
const selectedStationToAdd = ref('')
const addingStation = ref(false)
const removingStationId = ref<string | null>(null)

const availableStations = computed(() => {
  return allStations.value.filter(
    (s: any) => !driverStations.value.some((ds: any) => ds.id === s.id)
  )
})

const profileForm = reactive({
  fullName: '',
  phone: '',
  licenseNumber: '',
  licenseCity: '',
})
const savingProfile = ref(false)
const profileMessage = ref('')
const profileOk = ref(true)

const { config: sysConfig, load: loadConfig } = useSystemConfig()
const globalPerKm = computed(() => Number(sysConfig.value?.price_per_km ?? 1.2).toFixed(2))
const pricePerKm = ref<string | number>('')
const savingRate = ref(false)
const rateMessage = ref('')
const rateOk = ref(true)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function loadData() {
  try {
    const stations = await $fetch('/api/taxista/paradas')
    driverStations.value = stations as any[]

    const all = await $fetch('/api/paradas')
    allStations.value = all as any[]
  } catch (e) {
    console.error('Error loading stations:', e)
  }
}

onMounted(async () => {
  loadConfig()
  try {
    const data = await $fetch('/api/auth/me') as any
    driver.value = data?.driver
    pricePerKm.value = driver.value?.custom_price_per_km ?? ''

    profileForm.fullName = data?.full_name || ''
    profileForm.phone = data?.phone || ''
    profileForm.licenseNumber = driver.value?.license_number || ''
    profileForm.licenseCity = driver.value?.license_city || ''

    await loadData()
  } catch (e) {
    console.error('Error loading profile:', e)
  }
})

async function saveProfile() {
  savingProfile.value = true
  profileMessage.value = ''
  try {
    await $fetch('/api/taxista/perfil', {
      method: 'PATCH',
      body: {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        licenseNumber: profileForm.licenseNumber,
        licenseCity: profileForm.licenseCity,
      },
    })
    profileOk.value = true
    profileMessage.value = 'Perfil guardado correctamente'
    setTimeout(() => { profileMessage.value = '' }, 4000)
    
    // Recargar perfil para sincronizar estados locales
    const data = await $fetch('/api/auth/me') as any
    driver.value = data?.driver
  } catch (e: any) {
    profileOk.value = false
    profileMessage.value = e?.data?.message || 'No se pudo guardar el perfil'
  } finally {
    savingProfile.value = false
  }
}

async function addStation() {
  if (!selectedStationToAdd.value) return
  addingStation.value = true
  try {
    await $fetch(`/api/taxista/paradas/${selectedStationToAdd.value}`, { method: 'POST' })
    selectedStationToAdd.value = ''
    await loadData()
  } catch (e) {
    console.error('Error adding station:', e)
  } finally {
    addingStation.value = false
  }
}

async function removeStation(stationId: string) {
  removingStationId.value = stationId
  try {
    await $fetch(`/api/taxista/paradas/${stationId}`, { method: 'DELETE' })
    await loadData()
  } catch (e) {
    console.error('Error removing station:', e)
  } finally {
    removingStationId.value = null
  }
}

async function saveRate() {
  savingRate.value = true
  rateMessage.value = ''
  try {
    await $fetch('/api/taxista/tarifa', {
      method: 'PATCH',
      body: { pricePerKm: pricePerKm.value === '' ? null : Number(pricePerKm.value) },
    })
    rateOk.value = true
    rateMessage.value = pricePerKm.value === ''
      ? 'Usarás la tarifa global'
      : `Tarifa guardada: ${Number(pricePerKm.value).toFixed(2)} €/km`
    setTimeout(() => { rateMessage.value = '' }, 4000)
  } catch (e: any) {
    rateOk.value = false
    rateMessage.value = e?.data?.message || 'No se pudo guardar la tarifa'
  } finally {
    savingRate.value = false
  }
}

async function clearRate() {
  pricePerKm.value = ''
  await saveRate()
}
</script>

<style scoped>
.rate-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 10px 44px 10px 14px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.rate-input:focus {
  border-color: var(--secondary);
}

.profile-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.profile-input:focus {
  border-color: var(--secondary);
}
.profile-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.station-select {
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 9px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--on-surface);
  outline: none;
  cursor: pointer;
  max-width: 200px;
}
.station-select option {
  background: var(--surface-container-low);
  color: var(--on-surface);
}

.add-station-btn {
  background: var(--secondary);
  color: var(--on-secondary);
  border: none;
  border-radius: 9px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.add-station-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove-station-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.remove-station-btn:hover:not(:disabled) {
  background: rgba(217, 48, 37, 0.15);
  color: var(--status-error);
}
.remove-station-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
