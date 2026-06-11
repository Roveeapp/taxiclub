<template>
  <button
    :class="[
      'flex items-center gap-xs px-md py-xs rounded-full whitespace-nowrap active-scale transition-all',
      active
        ? 'bg-primary-container text-white border-none'
        : 'bg-surface-container-high border border-outline-variant text-on-surface',
    ]"
    @click="$emit('update:active', !active)"
  >
    <Icon v-if="icon" :name="icon" size="18" class="text-secondary" />
    <span class="font-label-caps text-label-caps">
      <slot />
    </span>
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
