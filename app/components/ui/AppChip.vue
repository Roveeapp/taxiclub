<template>
  <ToggleButton
    :model-value="active"
    :pt="chipPt"
    @update:model-value="$emit('update:active', $event)"
  >
    <Icon v-if="icon" :name="icon" size="18" class="text-secondary" />
    <span class="text-xs font-medium">
      <slot />
    </span>
  </ToggleButton>
</template>

<script setup lang="ts">
import ToggleButton from 'primevue/togglebutton'

defineProps<{
  active?: boolean
  icon?: string
}>()

defineEmits<{
  'update:active': [value: boolean]
}>()

const chipPt = {
  root: { class: '!rounded-full !px-3 !py-1.5 !text-xs !font-medium !border !border-slate-200 !bg-white !text-slate-600 hover:!bg-slate-100' },
  box: ({ props }: any) => ({
    class: props.modelValue ? '!bg-primary-container !text-white !border-primary-container' : '',
  }),
}
</script>
