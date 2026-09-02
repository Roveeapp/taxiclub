<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-on-surface">Miembros</h1>
        <p class="text-sm text-on-surface-variant mt-1">Altas, bajas y exenciones de la membresía del club</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm text-on-surface-variant">{{ memberCount }} {{ memberCount === 1 ? 'miembro' : 'miembros' }}</span>
        <select
          v-if="collaborators.length > 0"
          v-model="addMemberId"
          class="add-member-select"
          @change="addMember"
        >
          <option value="" disabled>+ Añadir miembro…</option>
          <option v-for="c in collaborators" :key="c.id" :value="c.id">
            {{ c.full_name }} ({{ c.license_number }})
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="card-surface rounded-xl overflow-hidden">
      <table class="w-full responsive-table">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Conductor</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Cuota</th>
            <th class="text-center text-xs font-medium text-on-surface-variant px-6 py-3">Exento</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="driver in members" :key="driver.id" class="hover:bg-surface-container transition-colors">
            <td class="px-6 py-4 mobile-primary" data-label="Conductor">
              <div>
                <p class="text-sm font-medium text-on-surface">{{ driver.full_name }}</p>
                <p class="text-xs text-on-surface-variant">
                  {{ driver.license_number }}
                  <span v-if="driver.member_since"> · miembro desde {{ formatDate(driver.member_since) }}</span>
                </p>
              </div>
            </td>
            <td class="px-6 py-4" data-label="Cuota">
              <span v-if="driver.is_exempt" class="text-xs text-on-surface-variant">Exento</span>
              <span v-else-if="driver.custom_monthly_fee !== null" class="text-sm text-brand-gold font-medium">
                {{ Number(driver.custom_monthly_fee).toFixed(2) }} € <span class="text-[10px]">(propia)</span>
              </span>
              <span v-else class="text-sm text-on-surface">{{ globalFee }} €</span>
            </td>
            <td class="px-6 py-4 text-center" data-label="Exento">
              <ToggleSwitch
                :model-value="driver.is_exempt"
                @update:model-value="(v: boolean) => updateDriver(driver, { isExempt: v })"
              />
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap mobile-actions" data-label="">
              <NuxtLink :to="`/admin/conductores/${driver.id}`" class="text-sm text-brand-gold hover:text-gold-600 mr-4">
                Ficha
              </NuxtLink>
              <button
                class="text-sm text-on-surface-variant hover:text-error transition-colors"
                @click="removeMember(driver)"
              >
                Dar de baja
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="members.length === 0" class="p-6 text-center text-on-surface-variant text-sm">
        No hay miembros. Añade uno desde el selector de arriba o desde la ficha de un conductor.
      </div>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" type="error" />
  </div>
</template>

<style scoped>
.add-member-select {
  max-width: 220px;
  background: rgb(var(--secondary));
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--color-brand-dark));
  outline: none;
  cursor: pointer;
}
.add-member-select option {
  background: rgb(var(--surface-container-low));
  color: rgb(var(--on-surface));
  font-weight: 400;
}
</style>

<script setup lang="ts">

import ToggleSwitch from 'primevue/toggleswitch'

const { confirmar } = useConfirmacion()

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const drivers = ref<any[]>([])
const loading = ref(true)
const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')

const { load: loadConfig, membershipMonthlyFee } = useSystemConfig()
const globalFee = computed(() => Number(membershipMonthlyFee.value).toFixed(2))

// Solo miembros en la tabla; los colaboradores aparecen en el selector de alta
const members = computed(() => drivers.value.filter((d: any) => d.is_member))
const collaborators = computed(() =>
  drivers.value
    .filter((d: any) => !d.is_member)
    .sort((a: any, b: any) => String(a.full_name).localeCompare(String(b.full_name))),
)
const memberCount = computed(() => members.value.length)

const addMemberId = ref('')

async function addMember() {
  const driver = drivers.value.find((d: any) => d.id === addMemberId.value)
  addMemberId.value = ''
  if (!driver) return
  await updateDriver(driver, { isMember: true })
}

async function removeMember(driver: any) {
  if (!await confirmar({
    titulo: 'Dar de baja la membresía',
    mensaje: `${driver.full_name} pasará a colaborador: dejará de entrar en el reparto de reservas y solo podrá publicar ofertas de Última Hora.`,
    textoConfirmar: 'Dar de baja',
    destructivo: true,
  })) return
  await updateDriver(driver, { isMember: false })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
}

onMounted(async () => {
  loadConfig()
  try {
    drivers.value = await $fetch('/api/admin/conductores') as any[]
  } catch (e) {
    console.error('Error loading drivers:', e)
  } finally {
    loading.value = false
  }
})

async function updateDriver(driver: any, patch: { isMember?: boolean, isExempt?: boolean }) {
  const prev = { is_member: driver.is_member, is_exempt: driver.is_exempt }
  if (patch.isMember !== undefined) driver.is_member = patch.isMember
  if (patch.isExempt !== undefined) driver.is_exempt = patch.isExempt

  try {
    await $fetch(`/api/admin/conductores/${driver.id}`, { method: 'PATCH', body: patch })
  } catch (e: any) {
    driver.is_member = prev.is_member
    driver.is_exempt = prev.is_exempt
    toastMessage.value = e?.data?.message || 'No se pudo guardar el cambio'
    toastRef.value?.show()
  }
}
</script>
