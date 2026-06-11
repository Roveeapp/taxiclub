<template>
  <nav class="bg-surface-container-low fixed bottom-0 w-full z-50 rounded-t-xl shadow-lg border-t border-white/5">
    <div class="flex justify-around items-center h-16 w-full max-w-mobile mx-auto px-lg">
      <NuxtLink
        to="/"
        class="flex flex-col items-center justify-center text-secondary font-bold hover:bg-surface-container-high active:scale-90 transition-all duration-150"
        active-class="!text-secondary font-bold"
        exact-active-class="!text-secondary font-bold"
      >
        <Icon name="tabler:home-filled" size="20" v-if="$route.path === '/'" />
        <Icon name="tabler:home" size="20" v-else />
        <span class="font-label-caps text-label-caps">Inicio</span>
      </NuxtLink>
      <NuxtLink
        to="/cuenta/reservas"
        class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high active:scale-90 transition-all duration-150"
        active-class="!text-secondary font-bold"
        exact-active-class="!text-secondary font-bold"
      >
        <Icon name="tabler:calendar-event" size="20" />
        <span class="font-label-caps text-label-caps">Reservas</span>
      </NuxtLink>
      <NuxtLink
        to="/cuenta"
        class="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high active:scale-90 transition-all duration-150"
        active-class="!text-secondary font-bold"
        exact-active-class="!text-secondary font-bold"
      >
        <Icon name="tabler:user" size="20" />
        <span class="font-label-caps text-label-caps">Cuenta</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
