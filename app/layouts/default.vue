<template>
  <div class="min-h-screen" style="background: var(--surface)">
    <AppHeader />
    <main class="mx-auto max-w-mobile px-md pb-24">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>
