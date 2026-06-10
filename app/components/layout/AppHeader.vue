<template>
  <header class="sticky top-0 z-50 bg-brand-dark border-b border-white/10">
    <div class="mx-auto max-w-[480px] px-4 h-14 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2">
        <BrandDot />
        <span class="text-white font-semibold text-base">Club Taxis</span>
      </NuxtLink>
      <div class="flex items-center gap-3">
        <NuxtLink to="/cuenta" class="text-white/60 hover:text-white transition-colors">
          <Icon name="ti:user" size="20" />
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
