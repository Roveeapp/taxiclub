<template>
  <div class="w-full h-4 bg-gray-200 rounded animate-pulse" :style="{ width: width || '100%' }" />
</template>

<script setup lang="ts">
defineProps<{
  width?: string
}>()
</script>
