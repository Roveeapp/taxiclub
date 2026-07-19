<template>
  <div>
    <label class="field-label block mb-1.5">{{ label }}</label>
    <input
      :value="modelValue"
      :type="secret && !reveal ? 'password' : 'text'"
      :placeholder="effectivePlaceholder"
      autocomplete="off"
      spellcheck="false"
      class="int-input"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <div class="flex items-center justify-between mt-1">
      <span v-if="current?.value" class="text-[11px] text-on-surface-variant">
        Actual: <code class="text-on-surface">{{ current.value }}</code>
      </span>
      <span v-else class="text-[11px] text-on-surface-variant/60">Sin valor</span>
      <button v-if="secret && modelValue" type="button" class="text-[11px] text-brand-gold" @click="reveal = !reveal">
        {{ reveal ? 'Ocultar' : 'Mostrar' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label: string
  current?: { value: string, source: string } | null
  secret?: boolean
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const reveal = ref(false)

const effectivePlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  return props.current?.value ? 'Escribe para reemplazar' : 'Sin configurar'
})
</script>

<style scoped>
.int-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: ui-monospace, monospace;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.int-input:focus {
  border-color: var(--secondary);
}
.int-input::placeholder {
  font-family: Inter, system-ui, sans-serif;
  color: var(--on-surface-variant);
  opacity: 0.5;
}
</style>
