<template>
  <div class="relative min-w-0 w-full">
    <label v-if="label" class="field-label block mb-1">{{ label }}</label>
    <div v-if="type === 'password'" class="relative w-full">
      <InputText
        :model-value="modelValue != null ? String(modelValue) : undefined"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="placeholder"
        :disabled="disabled"
        :pt="inputPt"
        class="w-full !pr-10"
        @update:model-value="$emit('update:modelValue', $event ?? '')"
      />
      <button 
        type="button" 
        class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
        @click="showPassword = !showPassword"
      >
        <Icon :name="showPassword ? 'tabler:eye-off' : 'tabler:eye'" size="20" />
      </button>
    </div>
    <InputText
      v-else-if="type !== 'number'"
      :model-value="modelValue != null ? String(modelValue) : undefined"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :pt="inputPt"
      class="w-full"
      @update:model-value="$emit('update:modelValue', $event ?? '')"
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
import { ref } from 'vue'
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

const showPassword = ref(false)

const inputPt = {
  root: { class: '!w-full !bg-surface-container !border !border-outline-variant !text-on-surface !placeholder-on-surface-variant !rounded-xl !shadow-none focus-within:!border-brand-gold transition-colors' },
}

const numberPt = {
  root: { class: '!w-full !min-w-0 !bg-surface-container !border !border-outline-variant !rounded-xl !shadow-none focus-within:!border-brand-gold transition-colors' },
  input: { class: '!w-full !min-w-0 !bg-surface-container !border-none !text-on-surface !text-left !shadow-none !rounded-xl !outline-none' },
  buttonGroup: { class: '!border-none' },
  incrementButton: { class: '!bg-transparent !border-none !text-on-surface-variant hover:!text-on-surface' },
  decrementButton: { class: '!bg-transparent !border-none !text-on-surface-variant hover:!text-on-surface' },
}
</script>

<style scoped>
/* PrimeVue InputNumber focus overrides */
:deep(.p-inputnumber input),
:deep(.p-inputtext) {
  background: rgb(var(--surface-container)) !important;
  color: rgb(var(--on-surface)) !important;
  border-color: rgb(var(--outline-variant)) !important;
  box-shadow: none !important;
}

:deep(.p-inputnumber input:focus),
:deep(.p-inputtext:focus) {
  background: rgb(var(--surface-container)) !important;
  color: rgb(var(--on-surface)) !important;
  border-color: rgb(var(--color-brand-gold)) !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.p-inputnumber) {
  background: rgb(var(--surface-container)) !important;
  width: 100% !important;
  max-width: 100% !important;
}

:deep(.p-inputnumber input) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
