<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t" style="background: var(--primary-container); border-color: var(--outline-variant)">
    <div class="mx-auto max-w-mobile px-md h-16 flex items-center justify-around">
      <NuxtLink
        to="/"
        class="flex flex-col items-center gap-1 transition-colors"
        style="color: var(--on-surface-variant)"
        active-class="text-secondary"
        exact-active-class="text-secondary"
      >
        <Icon name="tabler:home" size="20" />
        <span class="text-[10px]">Inicio</span>
      </NuxtLink>
      <NuxtLink
        to="/ultima-hora"
        class="flex flex-col items-center gap-1 transition-colors"
        style="color: var(--on-surface-variant)"
        active-class="text-secondary"
        exact-active-class="text-secondary"
      >
        <Icon name="tabler:bolt" size="20" />
        <span class="text-[10px]">Última Hora</span>
      </NuxtLink>
      <NuxtLink
        to="/cuenta"
        class="flex flex-col items-center gap-1 transition-colors"
        style="color: var(--on-surface-variant)"
        active-class="text-secondary"
        exact-active-class="text-secondary"
      >
        <Icon name="tabler:user" size="20" />
        <span class="text-[10px]">Cuenta</span>
      </NuxtLink>
    </div>
  </nav>
</template>
