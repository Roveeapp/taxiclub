<template>
  <div class="min-h-screen bg-brand-dark">
    <AppHeader />
    <main class="mx-auto max-w-[480px] px-4 pb-24">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>
