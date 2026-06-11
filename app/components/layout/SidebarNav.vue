<template>
  <aside class="fixed left-0 top-0 bottom-0 w-64 text-white flex flex-col" style="background: var(--primary-container)">
    <div class="p-6 border-b" style="border-color: var(--outline-variant)">
      <NuxtLink :to="dashboardLink" class="flex items-center gap-2">
        <BrandDot />
        <span class="font-semibold text-base">Club Taxis</span>
      </NuxtLink>
    </div>
    <nav class="flex-1 py-4 overflow-y-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-6 py-3 text-sm transition-colors"
        style="color: var(--on-surface-variant)"
        active-class="!text-secondary"
      >
        <Icon :name="item.icon" size="18" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
    <div class="p-4 border-t" style="border-color: var(--outline-variant)">
      <Button
        severity="secondary"
        text
        :pt="logoutPt"
        class="w-full flex justify-start"
        @click="handleLogout"
      >
        <Icon name="tabler:logout" size="18" />
        <span class="ml-3">Cerrar sesión</span>
      </Button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

const route = useRoute()

const isTaxista = computed(() => route.path.startsWith('/taxista'))
const dashboardLink = computed(() => isTaxista.value ? '/taxista' : '/admin')

const navItems = computed(() => {
  if (isTaxista.value) {
    return [
      { to: '/taxista', icon: 'tabler:layout-dashboard', label: 'Dashboard' },
      { to: '/taxista/reservas', icon: 'tabler:calendar-event', label: 'Reservas' },
      { to: '/taxista/disponibilidad', icon: 'tabler:calendar', label: 'Disponibilidad' },
      { to: '/taxista/vehiculos', icon: 'tabler:steering-wheel', label: 'Vehículos' },
      { to: '/taxista/ofertas', icon: 'tabler:bolt', label: 'Ofertas' },
      { to: '/taxista/liquidaciones', icon: 'tabler:coin', label: 'Liquidaciones' },
      { to: '/taxista/cuenta', icon: 'tabler:user', label: 'Mi cuenta' },
    ]
  }
  return [
    { to: '/admin', icon: 'tabler:layout-dashboard', label: 'Dashboard' },
    { to: '/admin/conductores', icon: 'tabler:users', label: 'Conductores' },
    { to: '/admin/reservas', icon: 'tabler:calendar-event', label: 'Reservas' },
    { to: '/admin/paradas', icon: 'tabler:map-pin', label: 'Paradas' },
    { to: '/admin/liquidaciones', icon: 'tabler:coin', label: 'Liquidaciones' },
    { to: '/admin/configuracion', icon: 'tabler:settings', label: 'Configuración' },
  ]
})

const handleLogout = async () => {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  navigateTo('/')
}

const logoutPt = {
  root: { class: '!text-[var(--on-surface-variant)] !py-2 !px-2 !text-sm !font-normal !justify-start !border-none !shadow-none' },
}
</script>
