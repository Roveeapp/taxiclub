<template>
  <span :class="['badge', `badge-${variant}`]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  variant: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'active'
  label: string
}>()
</script>

<style scoped>
.badge-active {
  background: rgba(240, 180, 41, 0.18);
  color: #f0b429;
}
</style>
