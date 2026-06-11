<template>
  <div class="relative">
    <label v-if="label" class="field-label block mb-1">{{ label }}</label>
    <InputText
      v-if="type !== 'number'"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :pt="inputPt"
      class="w-full"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <InputNumber
      v-else
      :model-value="modelValue !== null && modelValue !== '' ? Number(modelValue) : undefined"
      :placeholder="placeholder"
      :disabled="disabled"
      :pt="numberPt"
      class="w-full"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <span v-if="error" class="text-error text-xs mt-1 block">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'

defineProps<{
  modelValue?: string | number | null
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputPt = {
  root: { class: '!w-full !shadow-none' },
}

const numberPt = {
  input: { class: '!text-left !shadow-none' },
  buttonGroup: { class: '!border-none' },
  incrementButton: { class: '!bg-transparent !border-none !text-slate-400 hover:!text-slate-600' },
  decrementButton: { class: '!bg-transparent !border-none !text-slate-400 hover:!text-slate-600' },
}
</script>
