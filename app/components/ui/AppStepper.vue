<template>
  <div class="flex items-center gap-3">
    <button
      :disabled="modelValue <= min"
      class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
      aria-label="Reducir"
      @click="decrement"
    >
      −
    </button>
    <span class="text-lg font-medium w-8 text-center">{{ modelValue }}</span>
    <button
      :disabled="modelValue >= max"
      class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
      aria-label="Aumentar"
      @click="increment"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>(), {
  min: 0,
  max: 99,
  step: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function increment() {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + props.step)
  }
}

function decrement() {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - props.step)
  }
}
</script>
