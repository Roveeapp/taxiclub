<template>
  <Button
    :class="[
      fullWidth ? 'w-full' : '',
      variant === 'gold' ? '!bg-secondary !text-on-secondary !border-secondary' : '',
      variant === 'secondary' ? '!bg-surface-container-high !text-on-surface !border-outline-variant' : '',
    ]"
    :disabled="disabled || loading"
    :loading="loading"
    :pt="buttonPt"
    @click="$emit('click', $event)"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'gold'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}>(), {
  variant: 'primary',
  fullWidth: true,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonPt = {
  root: { class: '!rounded-xl !py-3 !font-bold !text-sm' },
}
</script>
