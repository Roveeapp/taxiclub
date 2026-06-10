<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-brand-dark border-t border-white/10">
    <div class="mx-auto max-w-[480px] px-4 h-16 flex items-center justify-around">
      <NuxtLink
        to="/"
        class="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
        active-class="text-brand-gold"
      >
        <Icon name="ti:home" size="20" />
        <span class="text-[10px]">Inicio</span>
      </NuxtLink>
      <NuxtLink
        to="/ultima-hora"
        class="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
        active-class="text-brand-gold"
      >
        <Icon name="ti:bolt" size="20" />
        <span class="text-[10px]">Última Hora</span>
      </NuxtLink>
      <NuxtLink
        to="/cuenta"
        class="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
        active-class="text-brand-gold"
      >
        <Icon name="ti:user" size="20" />
        <span class="text-[10px]">Cuenta</span>
      </NuxtLink>
    </div>
  </nav>
</template>
