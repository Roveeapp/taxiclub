<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Configuración global</h1>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else class="space-y-6 max-w-2xl">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Reservas</h2>
        <div class="space-y-4">
          <div>
            <label class="field-label block mb-1">Horas mínimas de antelación</label>
            <input
              v-model.number="config.min_advance_hours"
              type="number"
              min="1"
              max="72"
              class="w-full bg-gray-50 rounded-input px-4 py-3 text-sm text-gray-900 border border-gray-200 focus:border-brand-gold focus:outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Tiempo mínimo entre la reserva y la recogida</p>
          </div>
          <div>
            <label class="field-label block mb-1">Horas máximas para cancelar</label>
            <input
              v-model.number="config.max_cancel_hours_before"
              type="number"
              min="1"
              max="168"
              class="w-full bg-gray-50 rounded-input px-4 py-3 text-sm text-gray-900 border border-gray-200 focus:border-brand-gold focus:outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Horas antes del viaje en que se puede cancelar</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Comisiones</h2>
        <div class="space-y-4">
          <div>
            <label class="field-label block mb-1">Comisión miembros (%)</label>
            <input
              v-model.number="config.commission_member_pct"
              type="number"
              min="0"
              max="50"
              class="w-full bg-gray-50 rounded-input px-4 py-3 text-sm text-gray-900 border border-gray-200 focus:border-brand-gold focus:outline-none"
            />
          </div>
          <div>
            <label class="field-label block mb-1">Comisión no miembros (%)</label>
            <input
              v-model.number="config.commission_non_member_pct"
              type="number"
              min="0"
              max="50"
              class="w-full bg-gray-50 rounded-input px-4 py-3 text-sm text-gray-900 border border-gray-200 focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-4">Membresía</h2>
        <div>
          <label class="field-label block mb-1">Cuota mensual (€)</label>
          <input
            v-model.number="config.membership_monthly_fee"
            type="number"
            min="0"
            step="0.01"
            class="w-full bg-gray-50 rounded-input px-4 py-3 text-sm text-gray-900 border border-gray-200 focus:border-brand-gold focus:outline-none"
          />
        </div>
      </div>

      <AppButton
        :loading="saving"
        @click="handleSave"
      >
        Guardar configuración
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const config = ref<Record<string, any>>({})
const loading = ref(true)
const saving = ref(false)

onMounted(async () => {
  try {
    const data = await $fetch('/api/admin/configuracion')
    config.value = data as any
  } catch (e) {
    console.error('Error loading config:', e)
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  try {
    await $fetch('/api/admin/configuracion', {
      method: 'PATCH',
      body: config.value,
    })
  } catch (e) {
    console.error('Error saving config:', e)
  } finally {
    saving.value = false
  }
}
</script>
