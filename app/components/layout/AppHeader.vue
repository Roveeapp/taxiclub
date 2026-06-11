<template>
  <header class="sticky top-0 z-50 border-b" style="background: var(--primary-container); border-color: var(--outline-variant)">
    <div class="mx-auto max-w-mobile px-md h-14 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <BrandDot />
        <span class="text-white font-semibold text-base">Club Taxis</span>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <NuxtLink to="/cuenta" class="hover:text-white transition-colors" style="color: var(--on-surface-variant)">
          <Icon name="tabler:user" size="20" />
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
