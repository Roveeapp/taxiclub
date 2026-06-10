<template>
  <div class="min-h-screen bg-[#f8f8fc]">
    <div class="flex">
      <SidebarNav />
      <main class="flex-1 ml-64 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
