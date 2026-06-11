<template>
  <InputNumber
    :model-value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    show-buttons
    :pt="stepperPt"
    class="w-32"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'

withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>(), {
  min: 0,
  max: 99,
  step: 1,
})

defineEmits<{
  'update:modelValue': [value: number]
}>()

const stepperPt = {
  input: { class: '!w-12 !text-center !bg-white !border !border-slate-200 !rounded-lg !text-sm !shadow-none' },
  buttonGroup: { class: '!border-none' },
  incrementButton: { class: '!w-8 !h-8 !rounded-full !bg-white !border !border-slate-200 !text-slate-500 hover:!bg-slate-50 !text-sm' },
  decrementButton: { class: '!w-8 !h-8 !rounded-full !bg-white !border !border-slate-200 !text-slate-500 hover:!bg-slate-50 !text-sm' },
}
</script>
