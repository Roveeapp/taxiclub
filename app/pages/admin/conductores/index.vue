<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Conductores</h1>
      <div class="flex items-center gap-2">
        <AppButton @click="showNew = true">
          <Icon name="tabler:user-plus" size="16" class="mr-1.5" />
          Nuevo conductor
        </AppButton>
        <AppFilterTabs v-model="activeFilter" :opciones="filters" />
      </div>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="card-surface rounded-xl overflow-x-auto">
      <table class="w-full min-w-[640px] sm:min-w-0">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Conductor</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Licencia</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Membresía</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Estado</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="driver in filteredDrivers" :key="driver.id" class="hover:bg-surface-container transition-colors">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                  <Icon name="tabler:user" size="16" class="text-on-surface-variant" />
                </div>
                <div>
                  <p class="text-sm font-medium text-on-surface">{{ driver.full_name }}</p>
                  <p class="text-xs text-on-surface-variant">{{ driver.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-on-surface-variant">{{ driver.license_number }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-1.5">
                <span
                  class="text-xs px-2 py-1 rounded-full"
                  :class="driver.is_member ? 'bg-success/10 text-success' : 'bg-surface-container-high text-on-surface-variant'"
                >
                  {{ driver.is_member ? 'Miembro' : 'Colaborador' }}
                </span>
                <span
                  v-if="driver.custom_monthly_fee !== null || driver.custom_commission_pct !== null"
                  class="text-xs px-2 py-1 rounded-full bg-secondary/15 text-secondary"
                  title="Cuota o comisión personalizada"
                >
                  <Icon name="tabler:adjustments-dollar" size="12" class="inline -mt-0.5" />
                  Personalizada
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                v-if="driver.is_approved === false"
                class="text-xs px-2 py-1 rounded-full bg-warning/15 text-warning"
              >
                Pendiente de aprobar
              </span>
              <span
                v-else
                class="text-xs px-2 py-1 rounded-full"
                :class="driver.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
              >
                {{ driver.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <NuxtLink
                :to="`/admin/conductores/${driver.id}`"
                class="text-sm text-brand-gold hover:text-gold-600"
              >
                Ver perfil
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredDrivers.length === 0" class="p-6 text-center text-on-surface-variant text-sm">
        No hay conductores con este filtro
      </div>
    </div>

    <!-- Modal de alta -->
    <Teleport to="body">
      <div v-if="showNew" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showNew = false" />
        <div class="relative w-full max-w-lg bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold text-on-surface">Nuevo conductor</h2>
            <button class="text-on-surface-variant hover:text-on-surface" aria-label="Cerrar" @click="showNew = false">
              <Icon name="tabler:x" size="18" />
            </button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="field-label block mb-1.5">Nombre completo *</label>
                <input v-model="newDriver.fullName" class="drv-input" placeholder="Nombre y apellidos">
              </div>
              <div>
                <label class="field-label block mb-1.5">Teléfono</label>
                <input v-model="newDriver.phone" type="tel" class="drv-input" placeholder="+34 600 000 000">
              </div>
              <div>
                <label class="field-label block mb-1.5">Email de acceso *</label>
                <input v-model="newDriver.email" type="email" class="drv-input" placeholder="email@ejemplo.com" autocomplete="off">
              </div>
              <div>
                <label class="field-label block mb-1.5">Contraseña *</label>
                <input v-model="newDriver.password" type="password" class="drv-input" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
              </div>
              <div>
                <label class="field-label block mb-1.5">Nº de licencia *</label>
                <input v-model="newDriver.licenseNumber" class="drv-input" placeholder="Ej: 042">
              </div>
              <div>
                <label class="field-label block mb-1.5">Ciudad de la licencia *</label>
                <input v-model="newDriver.licenseCity" class="drv-input" placeholder="Ej: Oviedo">
              </div>
            </div>

            <label class="flex items-center justify-between cursor-pointer bg-surface-container rounded-xl px-4 py-3">
              <div>
                <span class="text-sm text-on-surface block">Miembro del club</span>
                <span class="text-[11px] text-on-surface-variant">Sin marcar: colaborador (solo ofertas de Última Hora)</span>
              </div>
              <ToggleSwitch v-model="newDriver.isMember" />
            </label>

            <p v-if="createError" class="text-xs text-error">{{ createError }}</p>

            <div class="flex items-center gap-3 pt-1">
              <AppButton :loading="creating" :disabled="!canCreate" @click="createDriver">
                Dar de alta
              </AppButton>
              <button class="text-sm text-on-surface-variant hover:text-on-surface" @click="showNew = false">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const drivers = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref('all')

// Alta de conductor
const showNew = ref(false)
const creating = ref(false)
const createError = ref('')
const newDriver = reactive({
  fullName: '',
  phone: '',
  email: '',
  password: '',
  licenseNumber: '',
  licenseCity: '',
  isMember: true,
})

const canCreate = computed(() =>
  !!newDriver.fullName.trim() && !!newDriver.email.trim()
  && newDriver.password.length >= 6
  && !!newDriver.licenseNumber.trim() && !!newDriver.licenseCity.trim(),
)

async function createDriver() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/admin/conductores', { method: 'POST', body: { ...newDriver } })
    showNew.value = false
    Object.assign(newDriver, { fullName: '', phone: '', email: '', password: '', licenseNumber: '', licenseCity: '', isMember: true })
    const data = await $fetch('/api/admin/conductores')
    drivers.value = data as any[]
  } catch (e: any) {
    createError.value = e?.data?.message || 'No se pudo crear el conductor'
  } finally {
    creating.value = false
  }
}

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'members', label: 'Miembros' },
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
]

const filteredDrivers = computed(() => {
  switch (activeFilter.value) {
    case 'members': return drivers.value.filter((d: any) => d.is_member)
    case 'active': return drivers.value.filter((d: any) => d.is_active)
    case 'pending': return drivers.value.filter((d: any) => d.is_approved === false)
    default: return drivers.value
  }
})

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/conductores')
    drivers.value = data as any[]
  } catch (e) {
    console.error('Error loading drivers:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.drv-input {
  width: 100%;
  background: rgb(var(--surface-container));
  border: 1px solid rgb(var(--outline-variant));
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: rgb(var(--on-surface));
  outline: none;
  transition: border-color 0.15s ease;
}
.drv-input:focus {
  border-color: rgb(var(--secondary));
}
</style>
