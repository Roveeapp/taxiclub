<template>
  <button
    type="button"
    class="chip"
    :class="{ 'chip-active': active }"
    :aria-pressed="active"
    @click="$emit('update:active', !active)"
  >
    <Icon
      :name="active ? 'tabler:check' : (icon || 'tabler:plus')"
      size="15"
      class="chip-icon"
    />
    <span class="text-xs font-medium">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean
  icon?: string
}>()

defineEmits<{
  'update:active': [value: boolean]
}>()
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9999px;
  border: 1px solid var(--outline-variant);
  background: var(--surface-container);
  color: var(--on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: rgba(250, 189, 50, 0.5);
  color: var(--on-surface);
}

.chip:active {
  transform: scale(0.96);
}

.chip-icon {
  color: var(--on-surface-variant);
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.chip:hover .chip-icon {
  color: var(--secondary);
}

/* Seleccionado: dorado sólido, inconfundible */
.chip-active {
  background: var(--secondary);
  border-color: var(--secondary);
  color: #0c0c13;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(250, 189, 50, 0.25);
}

.chip-active .chip-icon,
.chip-active:hover .chip-icon {
  color: #0c0c13;
}

.chip-active:hover {
  border-color: var(--secondary);
  color: #0c0c13;
  filter: brightness(1.05);
}
</style>
