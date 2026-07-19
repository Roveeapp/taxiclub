<template>
  <Transition name="offline">
    <div
      v-if="!isOnline"
      class="fixed top-0 inset-x-0 z-[200] bg-status-error text-white text-center text-[13px] font-medium py-2 px-4 flex items-center justify-center gap-2"
      role="status"
      aria-live="polite"
    >
      <Icon name="tabler:wifi-off" size="15" />
      Sin conexión — reintentando automáticamente…
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useOnline } from '@vueuse/core'

const isOnline = useOnline()
</script>

<style scoped>
.offline-enter-active,
.offline-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.offline-enter-from,
.offline-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
