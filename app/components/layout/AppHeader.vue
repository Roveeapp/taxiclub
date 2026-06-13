<template>
  <header class="bg-background w-full top-0 sticky z-50 border-b border-white/5">
    <div class="flex justify-between items-center px-md py-sm w-full max-w-mobile mx-auto">
      <Button
        icon="tabler:menu-2"
        severity="secondary"
        text
        rounded
        :pt="iconBtnPt"
        @click="drawerOpen = true"
      />
      <h1 class="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">
        CLUB <span class="text-secondary">TAXIS</span>
      </h1>
      <NuxtLink to="/cuenta" class="flex items-center">
        <div v-if="user" class="w-8 h-8 rounded-full overflow-hidden border-2 border-secondary hover:opacity-80 active:scale-95 transition-all duration-200">
          <img
            v-if="user.user_metadata?.avatar_url"
            :src="user.user_metadata.avatar_url"
            :alt="user.email || 'Usuario'"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-secondary/20 flex items-center justify-center">
            <Icon name="tabler:user" size="16" class="text-secondary" />
          </div>
        </div>
        <Button
          v-else
          severity="secondary"
          text
          rounded
          :pt="iconBtnPt"
        >
          <BrandDot />
        </Button>
      </NuxtLink>
    </div>
  </header>

  <!-- Drawer lateral -->
  <Transition name="drawer">
    <div v-if="drawerOpen" class="fixed inset-0 z-[100] flex">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="drawerOpen = false" />
      <nav class="relative w-72 max-w-[85vw] h-full bg-surface-container-low flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-lg py-md border-b border-white/5">
          <span class="font-headline-md text-on-surface font-semibold">CLUB <span class="text-secondary">TAXIS</span></span>
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors" @click="drawerOpen = false">
            <Icon name="tabler:x" size="18" />
          </button>
        </div>
        <ul class="flex-1 px-sm py-md space-y-xs overflow-y-auto">
          <li v-for="item in navItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="flex items-center gap-sm px-sm py-sm rounded-input text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
              active-class="!bg-secondary/10 !text-secondary font-medium"
              @click="drawerOpen = false"
            >
              <Icon :name="item.icon" size="20" />
              <span class="text-[15px]">{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
        <div v-if="user" class="px-lg py-md border-t border-white/5">
          <p class="text-[12px] text-on-surface-variant truncate mb-sm">{{ user.email }}</p>
          <button
            class="w-full flex items-center gap-sm text-error/80 hover:text-error text-[14px] transition-colors"
            @click="handleSignOut"
          >
            <Icon name="tabler:logout" size="18" />
            Cerrar sesión
          </button>
        </div>
      </nav>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

const user = useSupabaseUser()
const authStore = useAuthStore()
const drawerOpen = ref(false)

const navItems = [
  { to: '/', icon: 'tabler:home', label: 'Inicio' },
  { to: '/ultima-hora', icon: 'tabler:clock-bolt', label: 'Última Hora' },
  { to: '/cuenta/reservas', icon: 'tabler:calendar-event', label: 'Mis Reservas' },
  { to: '/cuenta', icon: 'tabler:user', label: 'Mi Cuenta' },
]

async function handleSignOut() {
  drawerOpen.value = false
  await authStore.signOut()
}

const iconBtnPt = {
  root: { class: '!text-secondary hover:!opacity-80 !w-9 !h-9 !p-0' },
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active nav,
.drawer-leave-active nav {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from nav,
.drawer-leave-to nav {
  transform: translateX(-100%);
}
</style>
