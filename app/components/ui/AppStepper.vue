<template>
  <div class="stepper">
    <button
      type="button"
      class="stepper-btn"
      :disabled="modelValue <= min"
      aria-label="Reducir"
      @click="change(-step)"
    >
      <Icon name="tabler:minus" size="15" />
    </button>
    <span class="stepper-value" aria-live="polite">{{ modelValue }}</span>
    <button
      type="button"
      class="stepper-btn"
      :disabled="modelValue >= max"
      aria-label="Aumentar"
      @click="change(step)"
    >
      <Icon name="tabler:plus" size="15" />
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

function change(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, (props.modelValue ?? 0) + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 12px;
  padding: 6px;
}

.stepper-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 9px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250, 189, 50, 0.12);
  color: var(--secondary);
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.stepper-btn:not(:disabled):hover {
  background: rgba(250, 189, 50, 0.22);
}

.stepper-btn:not(:disabled):active {
  transform: scale(0.94);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--on-surface);
  text-align: center;
  min-width: 2ch;
  font-variant-numeric: tabular-nums;
}
</style>
