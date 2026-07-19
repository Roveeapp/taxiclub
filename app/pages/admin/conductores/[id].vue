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
            <div>
              <span class="text-sm text-on-surface-variant block">Aprobado</span>
              <span class="text-[11px] text-on-surface-variant/60">Sin aprobación no recibe asignaciones</span>
            </div>
            <ToggleSwitch v-model="driver.is_approved" />
          </label>
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

        <div class="border-t border-outline-variant pt-4 mb-6">
          <h3 class="text-sm font-medium text-on-surface mb-1">Cuota y comisión personalizadas</h3>
          <p class="text-xs text-on-surface-variant mb-4">
            Déjalo vacío para usar los valores globales de configuración.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="field-label block mb-1.5">Cuota mensual (€)</label>
              <input
                v-model="customMonthlyFee"
                type="number"
                min="0"
                step="0.01"
                :placeholder="`Global: ${globalMonthlyFee} €`"
                class="fee-input"
              >
              <p v-if="customMonthlyFee !== ''" class="text-[11px] text-brand-gold mt-1">
                Personalizada — sustituye a la global ({{ globalMonthlyFee }} €)
              </p>
            </div>
            <div>
              <label class="field-label block mb-1.5">Comisión por viaje (%)</label>
              <input
                v-model="customCommissionPct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                :placeholder="`Global: ${globalCommissionLabel}`"
                class="fee-input"
              >
              <p v-if="customCommissionPct !== ''" class="text-[11px] text-brand-gold mt-1">
                Personalizada — sustituye a la global ({{ globalCommissionLabel }})
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-outline-variant pt-4 mb-6">
          <h3 class="text-sm font-medium text-on-surface mb-1">Credenciales de acceso</h3>
          <p class="text-xs text-on-surface-variant mb-4">
            Cambia el email de acceso o establece una contraseña nueva. Deja la contraseña vacía para no cambiarla.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="field-label block mb-1.5">Email de acceso</label>
              <input
                v-model="credentialsEmail"
                type="email"
                placeholder="email@ejemplo.com"
                autocomplete="off"
                class="fee-input"
              >
            </div>
            <div>
              <label class="field-label block mb-1.5">Nueva contraseña</label>
              <input
                v-model="credentialsPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
                class="fee-input"
              >
              <p v-if="credentialsPassword" class="text-[11px] text-warning mt-1">
                Se cambiará al guardar — avisa al conductor de su nueva contraseña
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
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

          <button
            class="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
            :disabled="deleting"
            @click="handleDelete"
          >
            <Icon name="tabler:trash" size="15" />
            {{ deleting ? 'Eliminando…' : 'Dar de baja' }}
          </button>
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

// Cuota/comisión personalizadas ('' = usar valor global)
const customMonthlyFee = ref<string | number>('')
const customCommissionPct = ref<string | number>('')

// Credenciales de acceso
const credentialsEmail = ref('')
const credentialsPassword = ref('')

// Baja definitiva
const router = useRouter()
const deleting = ref(false)

async function handleDelete() {
  if (!confirm(`¿Dar de baja definitivamente a ${driver.value?.full_name || 'este conductor'}? Se eliminará su cuenta y no podrá acceder. Sus reservas históricas se conservan.`)) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/conductores/${route.params.id}`, { method: 'DELETE' })
    await router.push('/admin/conductores')
  } catch (e: any) {
    saveError.value = e?.data?.message || 'No se pudo dar de baja'
    setTimeout(() => { saveError.value = '' }, 6000)
  } finally {
    deleting.value = false
  }
}

const { load: loadConfig, membershipMonthlyFee, commissionMemberPct, commissionNonMemberPct } = useSystemConfig()

const globalMonthlyFee = computed(() => membershipMonthlyFee.value)
const globalCommissionLabel = computed(() =>
  driver.value?.is_member ? `${commissionMemberPct.value}%` : `${commissionNonMemberPct.value}%`,
)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  loadConfig()
  try {
    const data = await $fetch(`/api/admin/conductores`)
    const drivers = data as any[]
    driver.value = drivers.find((d: any) => d.id === route.params.id)
    if (driver.value) {
      customMonthlyFee.value = driver.value.custom_monthly_fee ?? ''
      customCommissionPct.value = driver.value.custom_commission_pct ?? ''
      credentialsEmail.value = driver.value.email ?? ''
    }
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
        isApproved: driver.value.is_approved,
        customMonthlyFee: customMonthlyFee.value === '' ? null : Number(customMonthlyFee.value),
        customCommissionPct: customCommissionPct.value === '' ? null : Number(customCommissionPct.value),
        // Credenciales: solo se envían si cambian
        email: credentialsEmail.value && credentialsEmail.value !== driver.value.email
          ? credentialsEmail.value
          : undefined,
        password: credentialsPassword.value || undefined,
      },
    })
    if (credentialsEmail.value) driver.value.email = credentialsEmail.value
    credentialsPassword.value = ''
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
.fee-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.fee-input:focus {
  border-color: var(--secondary);
}
.fee-input::placeholder {
  color: var(--on-surface-variant);
  opacity: 0.6;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
