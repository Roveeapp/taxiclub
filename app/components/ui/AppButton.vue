<template>
  <button
    :class="[
      'w-full font-bold py-md rounded-xl active-scale flex items-center justify-center gap-sm transition-all',
      variant === 'gold' && 'bg-secondary text-on-secondary',
      variant === 'primary' && 'bg-primary-container text-white',
      variant === 'secondary' && 'bg-white text-primary-container border border-outline-variant',
      (disabled || loading) && 'opacity-40 cursor-not-allowed',
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="inline-block w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'gold'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'primary',
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>
