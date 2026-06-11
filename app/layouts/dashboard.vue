<template>
  <div class="min-h-screen" style="background: var(--surface-container-lowest)">
    <div class="flex">
      <SidebarNav />
      <main class="flex-1 ml-64 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
