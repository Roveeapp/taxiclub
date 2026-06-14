<template>
  <div>
    <NuxtLink to="/admin/conductores" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a conductores
    </NuxtLink>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else-if="driver" class="space-y-6 max-w-3xl">
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
            <Icon name="tabler:user" size="28" class="text-on-surface-variant" />
          </div>
          <div>
            <h1 class="text-xl font-semibold text-on-surface">{{ driver.full_name }}</h1>
            <p class="text-sm text-on-surface-variant">{{ driver.email }}</p>
            <p v-if="driver.phone" class="text-sm text-on-surface-variant">{{ driver.phone }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-container rounded-xl p-4">
            <span class="field-label block mb-1">Licencia</span>
            <p class="text-sm font-medium text-on-surface">{{ driver.license_number }}</p>
          </div>
          <div class="bg-surface-container rounded-xl p-4">
            <span class="field-label block mb-1">Ciudad</span>
            <p class="text-sm font-medium text-on-surface">{{ driver.license_city }}</p>
          </div>
          <div class="bg-surface-container rounded-xl p-4">
            <span class="field-label block mb-1">Miembro desde</span>
            <p class="text-sm font-medium text-on-surface">{{ driver.member_since ? formatDate(driver.member_since) : 'N/A' }}</p>
          </div>
          <div class="bg-surface-container rounded-xl p-4">
            <span class="field-label block mb-1">Vehículos</span>
            <p class="text-sm font-medium text-on-surface">{{ driver.vehicle_count || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Configuración</h2>
        <div class="space-y-4 mb-6">
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-on-surface-variant">Miembro del club</span>
            <ToggleSwitch v-model="driver.is_member" />
          </label>
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-on-surface-variant">Exento de cuota</span>
            <ToggleSwitch v-model="driver.is_exempt" />
          </label>
          <label class="flex items-center justify-between cursor-pointer">
            <span class="text-sm text-on-surface-variant">Activo</span>
            <ToggleSwitch v-model="driver.is_active" />
          </label>
        </div>

        <div class="flex items-center gap-3">
          <AppButton @click="handleSave" :loading="saving">
            <Icon name="tabler:device-floppy" size="16" class="mr-1.5" />
            Guardar cambios
          </AppButton>
          <Transition name="fade">
            <span v-if="saved" class="flex items-center gap-1.5 text-sm text-success">
              <Icon name="tabler:circle-check" size="16" />
              Guardado
            </span>
            <span v-else-if="saveError" class="flex items-center gap-1.5 text-sm text-error">
              <Icon name="tabler:alert-circle" size="16" />
              {{ saveError }}
            </span>
          </Transition>
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
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

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

async function handleSave() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const res = await $fetch(`/api/admin/conductores/${route.params.id}`, {
      method: 'PATCH',
      body: {
        isMember: driver.value.is_member,
        isExempt: driver.value.is_exempt,
        isActive: driver.value.is_active,
      },
    })
    console.log('[handleSave] OK', res)
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    console.error('[handleSave] Error completo:', e)
    const msg = e?.data?.message || e?.message || 'Error desconocido'
    saveError.value = msg
    setTimeout(() => { saveError.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
