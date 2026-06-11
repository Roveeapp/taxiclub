<template>
  <Select
    :model-value="modelValue"
    :options="options"
    option-label="label"
    option-value="value"
    :placeholder="placeholder"
    :pt="selectPt"
    class="w-full"
    append-to="self"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #value="slotProps">
      <div v-if="slotProps.value" class="flex items-center gap-2">
        <Icon v-if="icon" :name="icon" size="16" class="text-brand-gold" />
        <span>{{ selectedLabel }}</span>
      </div>
      <span v-else class="text-slate-400">{{ placeholder }}</span>
    </template>
    <template #option="slotProps">
      <div class="flex items-center gap-2">
        <Icon v-if="slotProps.option.icon" :name="slotProps.option.icon" size="16" />
        <span>{{ slotProps.option.label }}</span>
      </div>
    </template>
  </Select>
</template>

<script setup lang="ts">
import Select from 'primevue/select'

interface Option {
  value: string
  label: string
  icon?: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  label?: string
  placeholder?: string
  icon?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label
})

const selectPt = {
  root: { class: 'w-full !bg-white !border-2 !border-secondary !rounded-xl !shadow-sm !flex !items-center !p-0' },
  input: { 
    class: '!text-sm !font-medium !text-slate-900 !flex-1 !min-w-0 !p-3 !px-4 !m-0', 
    style: 'width: 100%; background: transparent; border: none; box-shadow: none; outline: none; border-radius: 0; appearance: none;' 
  },
  trigger: { class: '!w-8 !h-8 !text-slate-400 hover:!text-slate-600 !ml-2 !flex-shrink-0' },
  overlay: { class: '!bg-slate-50 !border !border-slate-200 !rounded-xl !shadow-lg !mt-2 !overflow-hidden' },
  list: { class: '!py-2' },
  option: { class: '!px-4 !py-2.5 !text-slate-700 !text-sm hover:!bg-amber-50 !rounded-lg !mx-2 !mb-0.5 !cursor-pointer' },
  optionSelected: { class: '!bg-amber-100 !text-slate-900' },
  optionCheckIcon: { class: '!text-brand-gold !w-4 !h-4 !ml-auto' },
  focusRing: { class: '!ring-0 !ring-offset-0' },
}
</script>
