<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-on-surface">Usuarios</h1>
        <p class="text-sm text-on-surface-variant mt-1">Clientes registrados en la plataforma</p>
      </div>
      <input v-model="search" type="search" placeholder="Buscar por nombre o email…" class="usr-input max-w-[260px]">
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Usuarios</p>
          <p class="text-2xl font-semibold text-on-surface">{{ users.length }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Nuevos este mes</p>
          <p class="text-2xl font-semibold text-success">{{ newThisMonth }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Con reservas</p>
          <p class="text-2xl font-semibold text-on-surface">{{ withBookings }}</p>
        </div>
        <div class="card-surface rounded-xl p-5">
          <p class="text-xs text-on-surface-variant mb-1">Gasto total</p>
          <p class="text-2xl font-semibold text-brand-gold">{{ totalSpent.toFixed(0) }} €</p>
        </div>
      </div>

      <div class="card-surface rounded-xl overflow-x-auto">
        <table class="w-full min-w-[640px] sm:min-w-0">
          <thead class="bg-surface-container border-b border-outline-variant">
            <tr>
              <th class="text-left text-xs font-medium text-on-surface-variant px-6 py-3">Usuario</th>
              <th class="text-left text-xs font-medium text-on-surface-variant px-4 py-3">Registro</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Reservas</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-4 py-3">Gastado</th>
              <th class="text-left text-xs font-medium text-on-surface-variant px-4 py-3">Última reserva</th>
              <th class="text-right text-xs font-medium text-on-surface-variant px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-surface-container transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <Icon name="tabler:user" size="15" class="text-on-surface-variant" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-on-surface truncate">{{ u.full_name || 'Sin nombre' }}</p>
                    <p class="text-xs text-on-surface-variant truncate">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-on-surface-variant whitespace-nowrap">{{ formatDate(u.created_at) }}</td>
              <td class="px-4 py-4 text-right text-sm font-medium text-on-surface">{{ u.stats.total }}</td>
              <td class="px-4 py-4 text-right text-sm text-brand-gold">{{ u.stats.spent.toFixed(2) }} €</td>
              <td class="px-4 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                {{ u.stats.lastBookingAt ? formatDate(u.stats.lastBookingAt) : '—' }}
              </td>
              <td class="px-6 py-4 text-right">
                <NuxtLink :to="`/admin/usuarios/${u.id}`" class="text-sm text-brand-gold hover:text-gold-600">
                  Ficha
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredUsers.length === 0" class="p-8 text-center text-on-surface-variant text-sm">
          {{ search ? 'Sin resultados para esta búsqueda' : 'Aún no hay usuarios registrados' }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const users = ref<any[]>([])
const loading = ref(true)
const search = ref('')

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter((u: any) =>
    String(u.full_name || '').toLowerCase().includes(q)
    || String(u.email || '').toLowerCase().includes(q),
  )
})

const newThisMonth = computed(() => {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return users.value.filter((u: any) => new Date(u.created_at) >= start).length
})

const withBookings = computed(() => users.value.filter((u: any) => u.stats.total > 0).length)
const totalSpent = computed(() => users.value.reduce((sum: number, u: any) => sum + u.stats.spent, 0))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    users.value = await $fetch('/api/admin/usuarios') as any[]
  } catch (e) {
    console.error('Error loading users:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.usr-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.usr-input:focus {
  border-color: var(--secondary);
}
</style>
