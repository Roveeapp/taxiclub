<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Configuración global</h1>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="space-y-6 max-w-2xl">
      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Reservas</h2>
        <div class="space-y-4">
          <div>
            <label class="field-label block mb-1">Horas mínimas de antelación</label>
            <InputNumber
              v-model="config.min_advance_hours"
              :min="1"
              :max="72"
              :pt="numberPt"
              class="w-full"
            />
            <p class="text-xs text-on-surface-variant mt-1">Tiempo mínimo entre la reserva y la recogida</p>
          </div>
          <div>
            <label class="field-label block mb-1">Horas máximas para cancelar</label>
            <InputNumber
              v-model="config.max_cancel_hours_before"
              :min="1"
              :max="168"
              :pt="numberPt"
              class="w-full"
            />
            <p class="text-xs text-on-surface-variant mt-1">Horas antes del viaje en que se puede cancelar</p>
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Comisiones</h2>
        <div class="space-y-4">
          <div>
            <label class="field-label block mb-1">Comisión miembros (%)</label>
            <InputNumber
              v-model="config.commission_member_pct"
              :min="0"
              :max="50"
              :pt="numberPt"
              class="w-full"
            />
          </div>
          <div>
            <label class="field-label block mb-1">Comisión no miembros (%)</label>
            <InputNumber
              v-model="config.commission_non_member_pct"
              :min="0"
              :max="50"
              :pt="numberPt"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Membresía</h2>
        <div>
          <label class="field-label block mb-1">Cuota mensual (€)</label>
          <InputNumber
            v-model="config.membership_monthly_fee"
            :min="0"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :pt="numberPt"
            class="w-full"
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
import InputNumber from 'primevue/inputnumber'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const config = ref<Record<string, any>>({})
const loading = ref(true)
const saving = ref(false)

const numberPt = {
  input: { class: '!bg-surface-container !rounded-lg !border !border-outline-variant !text-sm !text-on-surface !shadow-none focus:!border-brand-gold' },
}

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
