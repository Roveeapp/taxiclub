<template>
  <div class="relative">
    <button
      class="w-full flex items-center gap-3 bg-surface-input rounded-input px-4 py-3 text-left"
      @click="isOpen = !isOpen"
    >
      <div class="icon-wrap-dark">
        <Icon :name="icon" size="16" class="text-brand-gold" />
      </div>
      <div class="flex-1 min-w-0">
        <span class="field-label block">{{ label }}</span>
        <span class="text-sm text-text-on-light truncate block">
          {{ selectedLabel || placeholder }}
        </span>
      </div>
      <Icon
        name="ti:chevron-down"
        size="16"
        class="text-gray-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="mt-2 bg-white rounded-input border border-gray-200 overflow-hidden shadow-lg">
        <button
          v-for="option in options"
          :key="option.value"
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors"
          :class="{ 'bg-gold-50 text-brand-gold': option.value === modelValue }"
          @click="select(option)"
        >
          <Icon v-if="option.icon" :name="option.icon" size="16" />
          <span>{{ option.label }}</span>
          <Icon v-if="option.value === modelValue" name="ti:check" size="16" class="ml-auto text-brand-gold" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Option {
  value: string
  label: string
  icon?: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  label: string
  placeholder?: string
  icon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label
})

function select(option: Option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 200ms ease-out;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
