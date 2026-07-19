<template>
  <aside class="h-full w-full text-white flex flex-col" style="background: var(--primary-container)">
    <div class="p-6 border-b" style="border-color: var(--outline-variant)">
      <NuxtLink :to="dashboardLink" class="flex items-center gap-2" @click="$emit('close')">
        <BrandDot />
        <span class="font-semibold text-base">Club Taxis</span>
      </NuxtLink>
    </div>
    <nav class="flex-1 py-4 overflow-y-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="relative flex items-center gap-3 px-6 py-3 text-sm transition-colors"
        :class="isItemActive(item.to) ? 'nav-active' : 'nav-idle'"
        @click="$emit('close')"
      >
        <span v-if="isItemActive(item.to)" class="nav-marker" />
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

defineEmits(['close'])

const route = useRoute()
const { isDriver } = useAuth()

/**
 * Un item está activo si la ruta coincide exactamente o si es una
 * subpágina suya (ej. /taxista/reservas/123 activa "Reservas").
 * Las raíces de dashboard (/taxista, /admin) solo con coincidencia exacta.
 */
function isItemActive(to: string) {
  if (route.path === to) return true
  if (to === '/taxista' || to === '/admin') return false
  return route.path.startsWith(`${to}/`)
}

const isTaxista = computed(() => isDriver.value)
const dashboardLink = computed(() => isTaxista.value ? '/taxista' : '/admin')

// Los conductores NO miembros solo ven lo necesario para gestionar
// ofertas: sin Disponibilidad (no reciben reparto automático).
const isMember = ref(true)
onMounted(async () => {
  if (!isDriver.value) return
  try {
    const me: any = await $fetch('/api/auth/me')
    isMember.value = me?.driver?.is_member !== false
  } catch { /* por defecto, nav completa */ }
})

const navItems = computed(() => {
  if (isTaxista.value) {
    if (!isMember.value) {
      return [
        { to: '/taxista', icon: 'tabler:layout-dashboard', label: 'Dashboard' },
        { to: '/taxista/ofertas', icon: 'tabler:bolt', label: 'Mis ofertas' },
        { to: '/taxista/reservas', icon: 'tabler:calendar-event', label: 'Reservas' },
        { to: '/taxista/vehiculos', icon: 'tabler:steering-wheel', label: 'Vehículos' },
        { to: '/taxista/liquidaciones', icon: 'tabler:coin', label: 'Liquidaciones' },
        { to: '/taxista/cuenta', icon: 'tabler:user', label: 'Mi cuenta' },
      ]
    }
    return [
      { to: '/taxista', icon: 'tabler:layout-dashboard', label: 'Dashboard' },
      { to: '/taxista/reservas', icon: 'tabler:calendar-event', label: 'Reservas' },
      { to: '/taxista/disponibilidad', icon: 'tabler:calendar', label: 'Disponibilidad' },
      { to: '/taxista/zonas', icon: 'tabler:radar-2', label: 'Mis zonas' },
      { to: '/taxista/vehiculos', icon: 'tabler:steering-wheel', label: 'Vehículos' },
      { to: '/taxista/ofertas', icon: 'tabler:bolt', label: 'Ofertas' },
      { to: '/taxista/liquidaciones', icon: 'tabler:coin', label: 'Liquidaciones' },
      { to: '/taxista/cuenta', icon: 'tabler:user', label: 'Mi cuenta' },
    ]
  }
  return [
    { to: '/admin', icon: 'tabler:layout-dashboard', label: 'Dashboard' },
    { to: '/admin/conductores', icon: 'tabler:users', label: 'Conductores' },
    { to: '/admin/miembros', icon: 'tabler:crown', label: 'Miembros' },
    { to: '/admin/usuarios', icon: 'tabler:users-group', label: 'Usuarios' },
    { to: '/admin/reservas', icon: 'tabler:calendar-event', label: 'Reservas' },
    { to: '/admin/ofertas', icon: 'tabler:bolt', label: 'Ofertas' },
    { to: '/admin/paradas', icon: 'tabler:map-pin', label: 'Paradas' },
    { to: '/admin/accesorios', icon: 'tabler:paw', label: 'Accesorios' },
    { to: '/admin/estadisticas', icon: 'tabler:chart-bar', label: 'Estadísticas' },
    { to: '/admin/liquidaciones', icon: 'tabler:coin', label: 'Liquidaciones' },
    { to: '/admin/comisiones', icon: 'tabler:percentage', label: 'Comisiones' },
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

<style scoped>
.nav-idle {
  color: var(--on-surface-variant);
}
.nav-idle:hover {
  color: var(--on-surface);
  background: rgba(255, 255, 255, 0.03);
}
.nav-active {
  color: var(--secondary);
  background: rgba(250, 189, 50, 0.08);
  font-weight: 500;
}
.nav-marker {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: 0 3px 3px 0;
  background: var(--secondary);
}
</style>
