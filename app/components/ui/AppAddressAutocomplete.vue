<template>
  <div class="relative">
    <AppInput
      v-model="query"
      :label="label"
      :placeholder="placeholder"
      @input="handleInput"
    />

    <Transition name="dropdown">
      <div v-if="results.length > 0 && showResults" class="absolute z-50 w-full mt-1 bg-white rounded-input border border-gray-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
        <button
          v-for="(result, index) in results"
          :key="index"
          class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
          @click="selectResult(result)"
        >
          <Icon name="tabler:map-pin" size="16" class="text-brand-gold mt-0.5 flex-shrink-0" />
          <div class="min-w-0">
            <p class="text-sm text-gray-900 truncate">{{ result.display_name.split(',')[0] }}</p>
            <p class="text-xs text-gray-500 truncate">{{ result.display_name.split(',').slice(1).join(',').trim() }}</p>
          </div>
        </button>
      </div>
    </Transition>

    <div v-if="selected" class="mt-2 flex items-center gap-2 text-xs text-success">
      <Icon name="tabler:check" size="14" />
      <span class="truncate">{{ shortAddress }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GeocodingResult } from '~/composables/useGeocoding'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  modelValue?: string
}>(), {
  label: 'Dirección',
  placeholder: 'Buscar dirección...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [result: GeocodingResult]
}>()

const { search } = useGeocoding()

const query = ref(props.modelValue || '')
const results = ref<GeocodingResult[]>([])
const showResults = ref(false)
const selected = ref<GeocodingResult | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const shortAddress = computed(() => {
  if (!selected.value) return ''
  const parts = selected.value.display_name.split(',')
  return parts.slice(0, 2).join(',').trim()
})

function handleInput() {
  emit('update:modelValue', query.value)
  selected.value = null

  if (debounceTimer) clearTimeout(debounceTimer)

  if (query.value.length < 3) {
    results.value = []
    showResults.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    results.value = await search(query.value)
    showResults.value = results.value.length > 0
  }, 400)
}

async function selectResult(result: GeocodingResult) {
  selected.value = result
  query.value = result.display_name.split(',').slice(0, 2).join(',').trim()
  emit('update:modelValue', query.value)
  emit('select', result)
  results.value = []
  showResults.value = false
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.relative')) {
    showResults.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer) clearTimeout(debounceTimer)
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
