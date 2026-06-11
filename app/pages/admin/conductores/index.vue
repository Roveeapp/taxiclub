<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Conductores</h1>
      <div class="flex gap-2">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="activeFilter === filter.value
            ? 'bg-brand-dark text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Conductor</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Licencia</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Membresía</th>
            <th class="text-left text-xs font-medium text-gray-500 px-6 py-3">Estado</th>
            <th class="text-right text-xs font-medium text-gray-500 px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="driver in filteredDrivers" :key="driver.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon name="tabler:user" size="16" class="text-gray-400" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ driver.full_name }}</p>
                  <p class="text-xs text-gray-500">{{ driver.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">{{ driver.license_number }}</td>
            <td class="px-6 py-4">
              <span
                class="text-xs px-2 py-1 rounded-full"
                :class="driver.is_member ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'"
              >
                {{ driver.is_member ? 'Miembro' : 'No miembro' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <span
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

      <div v-if="filteredDrivers.length === 0" class="p-6 text-center text-gray-400 text-sm">
        No hay conductores con este filtro
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const drivers = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref('all')

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'members', label: 'Miembros' },
  { value: 'active', label: 'Activos' },
]

const filteredDrivers = computed(() => {
  switch (activeFilter.value) {
    case 'members': return drivers.value.filter((d: any) => d.is_member)
    case 'active': return drivers.value.filter((d: any) => d.is_active)
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
