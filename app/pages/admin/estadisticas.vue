<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-on-surface">Estadísticas</h1>
        <p class="text-sm text-on-surface-variant mt-1">Actividad por taxista</p>
      </div>
      <input v-model="month" type="month" class="month-input" :max="currentMonth">
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <template v-else-if="stats">
      <!-- Totales del mes -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Reservas</p>
          <p class="text-2xl font-semibold text-on-surface">{{ stats.totals.bookings }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Completadas</p>
          <p class="text-2xl font-semibold text-success">{{ stats.totals.completed }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Facturación</p>
          <p class="text-2xl font-semibold text-brand-gold">{{ stats.totals.revenue.toFixed(2) }} €</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Comisión plataforma</p>
          <p class="text-2xl font-semibold text-on-surface">{{ stats.totals.commission.toFixed(2) }} €</p>
        </div>
      </div>

      <!-- Por taxista -->
      <div class="card-surface rounded-xl overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 class="text-lg font-medium text-on-surface">Por taxista</h2>
          <span v-if="stats.unassigned > 0" class="text-xs text-warning">
            {{ stats.unassigned }} reservas sin asignar este mes
          </span>
        </div>
        <table class="w-full">
          <thead class="bg-surface-container border-b border-outline-variant">
            <tr>
              <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Taxista</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Completados</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Pendientes</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Cancelados</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Facturado</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3">Comisión</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="(d, i) in stats.perDriver" :key="d.driverId" class="hover:bg-surface-container transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <span class="w-6 h-6 rounded-full bg-surface-container-high text-[11px] font-semibold text-on-surface-variant flex items-center justify-center">{{ i + 1 }}</span>
                  <div>
                    <p class="text-sm font-medium text-on-surface flex items-center gap-1.5">
                      {{ d.name }}
                      <Icon v-if="d.isMember" name="tabler:crown" size="13" class="text-secondary" />
                    </p>
                    <p class="text-[11px] text-on-surface-variant">{{ d.licenseNumber }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-right text-sm font-medium text-success">{{ d.completed }}</td>
              <td class="px-4 py-4 text-right text-sm text-on-surface-variant">{{ d.pending }}</td>
              <td class="px-4 py-4 text-right text-sm text-on-surface-variant">{{ d.cancelled }}</td>
              <td class="px-4 py-4 text-right text-sm font-medium text-on-surface">{{ d.revenue.toFixed(2) }} €</td>
              <td class="px-6 py-4 text-right text-sm text-brand-gold">{{ d.commission.toFixed(2) }} €</td>
            </tr>
          </tbody>
        </table>
        <div v-if="stats.perDriver.length === 0" class="p-8 text-center text-on-surface-variant text-sm">
          Sin actividad este mes
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const currentMonth = new Date().toISOString().slice(0, 7)
const month = ref(currentMonth)
const stats = ref<any>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    stats.value = await $fetch(`/api/admin/estadisticas?month=${month.value}`)
  } catch (e) {
    console.error('Error loading stats:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(month, load)
</script>

<style scoped>
.month-input {
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  color-scheme: dark;
  transition: border-color 0.15s ease;
}
.month-input:focus {
  border-color: var(--secondary);
}
</style>
