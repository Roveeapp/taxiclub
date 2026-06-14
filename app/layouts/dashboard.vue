<template>
  <div class="min-h-screen flex flex-col md:flex-row" style="background: var(--surface-container-lowest)">
    
    <!-- Mobile Header -->
    <header class="md:hidden flex items-center justify-between p-4 bg-surface-container border-b border-outline-variant sticky top-0 z-40">
      <NuxtLink to="/taxista" class="flex items-center gap-2">
        <BrandDot />
        <span class="font-semibold text-base text-on-surface">Club Taxis</span>
      </NuxtLink>
      <button @click="mobileMenuOpen = true" class="text-on-surface p-2 rounded-lg hover:bg-outline-variant/20">
        <Icon name="tabler:menu-2" size="24" />
      </button>
    </header>

    <!-- Desktop Sidebar -->
    <div class="hidden md:block w-64 fixed left-0 top-0 bottom-0 z-30">
      <SidebarNav />
    </div>

    <!-- Main Content -->
    <main class="flex-1 w-full md:w-auto md:ml-64 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
      <slot />
    </main>

    <!-- Mobile Drawer Sidebar -->
    <Drawer 
      v-model:visible="mobileMenuOpen" 
      class="w-[280px] !bg-primary-container !border-none !p-0"
      :pt="{ 
        root: { style: 'background: var(--primary-container)' },
        header: { class: 'hidden' },
        content: { class: '!p-0' }
      }"
    >
      <SidebarNav @close="mobileMenuOpen = false" />
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import Drawer from 'primevue/drawer'

const mobileMenuOpen = ref(false)
</script>
