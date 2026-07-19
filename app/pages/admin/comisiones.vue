<template>
  <div>
    <h1 class="text-2xl font-semibold text-on-surface mb-1">Comisiones y tarifas</h1>
    <p class="text-sm text-on-surface-variant mb-6">
      Valores globales. Puedes personalizarlos por conductor desde su ficha.
    </p>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="space-y-6 max-w-2xl">
      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
          <Icon name="tabler:percentage" size="18" class="text-brand-gold" />
          Comisiones por viaje
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label block mb-1.5">Miembros del club (%)</label>
            <input v-model="form.commission_member_pct" type="number" min="0" max="100" step="0.5" class="cfg-input">
          </div>
          <div>
            <label class="field-label block mb-1.5">No miembros (%)</label>
            <input v-model="form.commission_non_member_pct" type="number" min="0" max="100" step="0.5" class="cfg-input">
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
          <Icon name="tabler:crown" size="18" class="text-brand-gold" />
          Membresía
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label block mb-1.5">Cuota mensual (€)</label>
            <input v-model="form.membership_monthly_fee" type="number" min="0" step="0.5" class="cfg-input">
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
          <Icon name="tabler:route" size="18" class="text-brand-gold" />
          Tarifas por distancia
        </h2>
        <p class="text-xs text-on-surface-variant mb-4">
          Se usan cuando una ruta no tiene precio fijo configurado: precio = bajada de bandera + km × tarifa.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="field-label block mb-1.5">Bajada de bandera (€)</label>
            <input v-model="form.base_fare" type="number" min="0" step="0.5" class="cfg-input">
          </div>
          <div>
            <label class="field-label block mb-1.5">Precio por km (€)</label>
            <input v-model="form.price_per_km" type="number" min="0" step="0.05" class="cfg-input">
          </div>
          <div>
            <label class="field-label block mb-1.5">Tarifa mínima (€)</label>
            <input v-model="form.min_fare" type="number" min="0" step="0.5" class="cfg-input">
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
          <Icon name="tabler:clock-cog" size="18" class="text-brand-gold" />
          Reservas
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label block mb-1.5">Antelación mínima (horas)</label>
            <input v-model="form.min_advance_hours" type="number" min="0" step="1" class="cfg-input">
          </div>
          <div>
            <label class="field-label block mb-1.5">Cancelación gratuita hasta (horas antes)</label>
            <input v-model="form.max_cancel_hours_before" type="number" min="0" step="1" class="cfg-input">
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <AppButton :loading="saving" @click="handleSave">
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
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const form = reactive<Record<string, any>>({
  commission_member_pct: 10,
  commission_non_member_pct: 12,
  membership_monthly_fee: 20,
  base_fare: 4,
  price_per_km: 1.2,
  min_fare: 10,
  min_advance_hours: 2,
  max_cancel_hours_before: 24,
})

onMounted(async () => {
  try {
    const config: any = await $fetch('/api/admin/configuracion')
    for (const key of Object.keys(form)) {
      if (config[key] !== undefined && config[key] !== null) form[key] = Number(config[key])
    }
  } catch (e) {
    console.error('Error loading config:', e)
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const body: Record<string, number> = {}
    for (const [key, value] of Object.entries(form)) body[key] = Number(value)
    await $fetch('/api/admin/configuracion', { method: 'PATCH', body })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e?.data?.message || 'No se pudo guardar'
    setTimeout(() => { saveError.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cfg-input {
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
.cfg-input:focus {
  border-color: var(--secondary);
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
