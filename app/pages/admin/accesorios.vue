<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-on-surface">Accesorios</h1>
        <p class="text-sm text-on-surface-variant mt-1">Extras que los taxistas pueden ofrecer y los clientes solicitar</p>
      </div>
      <AppButton @click="showNew = !showNew">
        <Icon name="tabler:plus" size="16" class="mr-1.5" />
        Nuevo accesorio
      </AppButton>
    </div>

    <!-- Alta -->
    <div v-if="showNew" class="card-surface rounded-xl p-6 border border-outline-variant mb-6 max-w-2xl">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label class="field-label block mb-1.5">Nombre *</label>
          <input v-model="newAcc.name" class="acc-input" placeholder="Ej: Sillita elevadora">
        </div>
        <div>
          <label class="field-label block mb-1.5">Icono (Tabler)</label>
          <input v-model="newAcc.icon" class="acc-input" placeholder="tabler:star">
        </div>
        <div>
          <label class="field-label block mb-1.5">Descripción</label>
          <input v-model="newAcc.description" class="acc-input" placeholder="Opcional">
        </div>
      </div>
      <div class="flex gap-3">
        <AppButton :loading="creating" :disabled="!newAcc.name.trim()" @click="createAccessory">Crear</AppButton>
        <button class="text-sm text-on-surface-variant hover:text-on-surface" @click="showNew = false">Cancelar</button>
      </div>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="card-surface rounded-xl overflow-hidden max-w-4xl">
      <table class="w-full">
        <thead class="bg-surface-container border-b border-outline-variant">
          <tr>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Accesorio</th>
            <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Descripción</th>
            <th class="text-center text-xs font-medium text-on-surface-variant px-6 py-3">Activo</th>
            <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr v-for="acc in accessories" :key="acc.id" class="hover:bg-surface-container transition-colors" :class="{ 'opacity-50': !acc.is_active }">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Icon :name="acc.icon || 'tabler:star'" size="18" class="text-secondary" />
                </div>
                <template v-if="editingId === acc.id">
                  <input v-model="editForm.name" class="acc-input !py-1.5">
                </template>
                <p v-else class="text-sm font-medium text-on-surface">{{ acc.name }}</p>
              </div>
            </td>
            <td class="px-6 py-4">
              <input v-if="editingId === acc.id" v-model="editForm.description" class="acc-input !py-1.5">
              <span v-else class="text-sm text-on-surface-variant">{{ acc.description || '—' }}</span>
            </td>
            <td class="px-6 py-4 text-center">
              <ToggleSwitch
                :model-value="acc.is_active"
                @update:model-value="(v: boolean) => toggleActive(acc, v)"
              />
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap">
              <template v-if="editingId === acc.id">
                <button class="text-sm text-success mr-3" @click="saveEdit(acc)">Guardar</button>
                <button class="text-sm text-on-surface-variant" @click="editingId = null">Cancelar</button>
              </template>
              <button v-else class="text-sm text-brand-gold hover:text-gold-600" @click="startEdit(acc)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="accessories.length === 0" class="p-6 text-center text-on-surface-variant text-sm">
        No hay accesorios. Crea el primero.
      </div>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const accessories = ref<any[]>([])
const loading = ref(true)
const showNew = ref(false)
const creating = ref(false)
const editingId = ref<string | null>(null)
const editForm = reactive({ name: '', description: '' })
const newAcc = reactive({ name: '', icon: '', description: '' })

const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function notify(type: 'success' | 'error', message: string) {
  toastType.value = type
  toastMessage.value = message
  toastRef.value?.show()
}

async function load() {
  try {
    accessories.value = await $fetch('/api/admin/accesorios') as any[]
  } catch (e) {
    console.error('Error loading accessories:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function createAccessory() {
  creating.value = true
  try {
    await $fetch('/api/admin/accesorios', { method: 'POST', body: { ...newAcc } })
    newAcc.name = ''
    newAcc.icon = ''
    newAcc.description = ''
    showNew.value = false
    await load()
    notify('success', 'Accesorio creado')
  } catch (e: any) {
    notify('error', e?.data?.message || 'No se pudo crear')
  } finally {
    creating.value = false
  }
}

async function toggleActive(acc: any, value: boolean) {
  const prev = acc.is_active
  acc.is_active = value
  try {
    await $fetch(`/api/admin/accesorios/${acc.id}`, { method: 'PATCH', body: { isActive: value } })
  } catch (e: any) {
    acc.is_active = prev
    notify('error', e?.data?.message || 'No se pudo cambiar el estado')
  }
}

function startEdit(acc: any) {
  editingId.value = acc.id
  editForm.name = acc.name
  editForm.description = acc.description || ''
}

async function saveEdit(acc: any) {
  try {
    await $fetch(`/api/admin/accesorios/${acc.id}`, {
      method: 'PATCH',
      body: { name: editForm.name, description: editForm.description },
    })
    acc.name = editForm.name
    acc.description = editForm.description
    editingId.value = null
    notify('success', 'Accesorio actualizado')
  } catch (e: any) {
    notify('error', e?.data?.message || 'No se pudo guardar')
  }
}
</script>

<style scoped>
.acc-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.acc-input:focus {
  border-color: var(--secondary);
}
</style>
