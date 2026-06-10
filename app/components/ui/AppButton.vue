<template>
  <button
    :class="[
      'btn-primary',
      variant === 'secondary' && 'bg-white text-brand-dark border border-gray-200',
      variant === 'gold' && 'bg-brand-gold text-brand-dark',
      loading && 'opacity-60 cursor-wait',
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'gold'
  disabled?: boolean
  loading?: boolean
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
