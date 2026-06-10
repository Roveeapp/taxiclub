<template>
  <button
    :class="[
      'inline-flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium border transition-all',
      active
        ? 'bg-brand-dark text-white border-brand-dark'
        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-dark'
    ]"
    @click="$emit('update:active', !active)"
  >
    <Icon v-if="icon" :name="icon" size="16" />
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean
  icon?: string
}>()

defineEmits<{
  'update:active': [value: boolean]
}>()
</script>
