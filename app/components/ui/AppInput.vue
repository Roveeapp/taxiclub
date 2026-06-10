<template>
  <div class="relative">
    <label v-if="label" class="field-label block mb-1">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-surface-input rounded-input px-4 py-3 text-sm text-text-on-light placeholder:text-text-muted-light border border-transparent focus:border-brand-gold focus:outline-none transition-colors"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="text-error text-xs mt-1 block">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
