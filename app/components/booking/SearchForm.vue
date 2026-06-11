<template>
  <div class="bg-white rounded-xl shadow-2xl p-md space-y-md">
    <!-- ORIGEN Selector (In-flow expansion) -->
    <div class="space-y-xs origin-dropdown">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase">Origen (Parada)</label>
      <button
          class="w-full flex items-center justify-between bg-surface-input px-md py-sm rounded-lg transition-all duration-200"
          :class="originOpen ? 'border-2 border-gold-accent' : ''"
        @click="originOpen = !originOpen"
      >
        <div class="flex items-center gap-sm">
          <Icon :name="originStationId ? 'tabler:map-pin-filled' : 'tabler:map-pin'" size="18" :class="originStationId ? 'text-gold-accent' : 'text-slate-400'" />
          <span :class="originStationId ? 'text-slate-900 font-medium' : 'text-slate-400'">
            {{ selectedStationName || 'Seleccionar parada' }}
          </span>
        </div>
        <Icon name="tabler:chevron-down" size="18" class="text-slate-400 transition-transform" :class="{ 'rotate-180': originOpen }" />
      </button>
      <div v-if="originOpen" class="mt-xs bg-slate-50 rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
        <div
          v-for="station in stations"
          :key="station.id"
          class="px-md py-sm flex items-center gap-sm cursor-pointer transition-colors"
          :class="station.id === originStationId ? 'bg-gold-accent/10' : 'hover:bg-slate-100'"
          @click="selectStation(station)"
        >
          <Icon :name="station.id === originStationId ? 'tabler:map-pin-filled' : 'tabler:map-pin'" size="18" :class="station.id === originStationId ? 'text-gold-accent' : 'text-slate-400'" />
          <span :class="station.id === originStationId ? 'text-slate-900 font-semibold' : 'text-slate-700'">{{ station.name }}</span>
          <Icon v-if="station.id === originStationId" name="tabler:check" size="16" class="text-gold-accent ml-auto" />
        </div>
      </div>
    </div>

    <!-- DESTINO Autocomplete -->
    <div class="space-y-xs dest-dropdown">
      <div class="flex items-center gap-md p-sm bg-surface-input rounded-lg">
        <Icon :name="destination ? 'tabler:map-pin-filled' : 'tabler:map-pin'" size="20" :class="destination ? 'text-secondary' : 'text-slate-400'" />
        <div class="flex flex-col flex-1">
          <label class="font-label-caps text-label-caps text-slate-500">{{ destination ? 'DESTINO FINAL' : 'Destino' }}</label>
          <input
            v-model="destQuery"
            type="text"
            placeholder="Escribe una dirección..."
              class="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-slate-900 placeholder:text-slate-400 font-body-md"
            @focus="destFocused = true"
            @input="onDestInput"
          />
        </div>
        <button v-if="destQuery" class="text-slate-400 hover:text-slate-600" @click="clearDest">
          <Icon name="tabler:x" size="18" />
        </button>
      </div>

      <!-- Autocomplete Results -->
      <div v-if="destSuggestions.length > 0 && destFocused" class="border-t border-surface-divider mt-xs bg-white rounded-lg border border-slate-200 overflow-hidden shadow-lg">
        <ul class="divide-y divide-surface-divider">
          <li
            v-for="(result, i) in destSuggestions"
            :key="result.id"
            class="p-md hover:bg-gold-50 cursor-pointer transition-colors flex items-center gap-md group animate-fade-in"
            :style="{ animationDuration: `${0.4 + i * 0.05}s` }"
            @mousedown.prevent="selectDest(result)"
          >
            <div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
              <Icon :name="result.icon" size="18" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-body-md text-slate-900 font-semibold truncate">{{ result.label }}</p>
              <p class="font-label-caps text-on-primary-container truncate">{{ result.description }}</p>
            </div>
            <span v-if="result.source === 'saved'" class="text-[10px] bg-secondary/10 text-secondary px-xs py-0.5 rounded-full font-medium">Guardado</span>
            <Icon name="tabler:chevron-right" size="18" class="text-outline group-hover:text-secondary transition-colors" />
          </li>
        </ul>
      </div>
    </div>

    <!-- FECHA y HORA -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Fecha</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg cursor-pointer" @click="openPicker(dateRef)">
          <Icon name="tabler:calendar" size="18" class="text-slate-400 mr-xs" />
          <input ref="dateRef" v-model="date" type="date" :min="minDate" class="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-slate-900 text-xs pointer-events-none" />
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Hora</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg cursor-pointer" @click="openPicker(timeRef)">
          <Icon name="tabler:clock" size="18" class="text-slate-400 mr-xs" />
          <input ref="timeRef" v-model="time" type="time" :min="minTime" class="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-slate-900 text-xs pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- PASAJEROS y EQUIPAJE -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Pasajeros</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg">
          <Icon name="tabler:users" size="18" class="text-slate-400 mr-xs" />
          <select v-model.number="passengers" class="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-slate-900 text-xs appearance-none">
            <option v-for="n in 8" :key="n" :value="n">{{ n }} {{ n === 1 ? 'persona' : 'personas' }}</option>
          </select>
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Equipaje</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg">
          <Icon name="tabler:luggage" size="18" class="text-slate-400 mr-xs" />
          <select v-model.number="luggageBig" class="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-slate-900 text-xs appearance-none">
            <option v-for="n in 6" :key="n" :value="n">{{ n }} {{ n === 1 ? 'maleta' : 'maletas' }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Accesorios dinámicos (desde API) -->
    <div class="flex flex-wrap gap-xs pt-xs">
      <button
        v-for="acc in accessories"
        :key="acc.id"
        class="flex items-center gap-xs px-sm py-xs rounded-full border transition-all"
        :class="selectedAccessories.has(acc.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="toggleAccessory(acc.id)"
      >
        <Icon :name="acc.icon" size="14" :class="selectedAccessories.has(acc.id) ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-[12px] font-medium">{{ acc.name }}</span>
      </button>
    </div>

    <!-- CTA -->
    <AppButton variant="gold" :disabled="!isFormValid" @click="handleSearch">
      Buscar Disponibilidad
    </AppButton>
  </div>
</template>

<script setup lang="ts">
interface Accessory { id: string; name: string; icon: string }
interface Station { id: string; name: string }

const props = withDefaults(defineProps<{
  stations?: Station[]
}>(), {
  stations: () => [],
})

const emit = defineEmits<{
  search: [data: SearchFormData]
}>()

const originStationId = ref('')
const destQuery = ref('')
const destination = ref('')
const destFocused = ref(false)
const destSuggestions = ref<Array<{ id: string; label: string; description: string; source: string; icon: string; lat?: number; lng?: number }>>([])
let destDebounce: ReturnType<typeof setTimeout> | null = null
const dateRef = ref<HTMLInputElement>()
const timeRef = ref<HTMLInputElement>()

const today = new Date()
const date = ref(today.toISOString().split('T')[0])
const time = ref('')
const passengers = ref(1)
const luggageBig = ref(0)
const originOpen = ref(false)
const accessories = ref<Accessory[]>([])
const selectedAccessories = ref(new Set<string>())

const minDate = computed(() => new Date().toISOString().split('T')[0])

const minTime = computed(() => {
  if (date.value !== minDate.value) return ''
  const now = new Date()
  const min = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  return min.toTimeString().slice(0, 5)
})

function openPicker(el?: HTMLInputElement) {
  if (el) {
    if (typeof (el as any).showPicker === 'function') {
      (el as any).showPicker()
    } else {
      el.focus()
    }
  }
}

const selectedStationName = computed(() =>
  props.stations.find(s => s.id === originStationId.value)?.name,
)

const isFormValid = computed(() =>
  originStationId.value && destination.value && date.value && time.value
    && (!minTime.value || time.value >= minTime.value),
)

interface SearchFormData {
  originStationId: string
  destination: string
  date: string
  time: string
  passengers: number
  luggageBig: number
  accessoryIds: string[]
}

function selectStation(station: Station) {
  originStationId.value = station.id
  originOpen.value = false
}

function onDestInput() {
  if (destDebounce) clearTimeout(destDebounce)
  destDebounce = setTimeout(async () => {
    if (destQuery.value.length < 2) {
      destSuggestions.value = []
      return
    }
    try {
      const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(destQuery.value)}`)
      destSuggestions.value = data as any[]
    } catch {
      destSuggestions.value = []
    }
  }, 300)
}

function selectDest(result: { id: string; label: string; description: string; lat?: number; lng?: number }) {
  destQuery.value = result.description || result.label
  destination.value = result.description || result.label
  destSuggestions.value = []
  destFocused.value = false
}

function clearDest() {
  destQuery.value = ''
  destination.value = ''
  destSuggestions.value = []
}

function toggleAccessory(id: string) {
  if (selectedAccessories.value.has(id)) {
    selectedAccessories.value.delete(id)
  } else {
    selectedAccessories.value.add(id)
  }
  selectedAccessories.value = new Set(selectedAccessories.value)
}

function handleSearch() {
  if (!isFormValid.value) return
  emit('search', {
    originStationId: originStationId.value,
    destination: destination.value,
    date: date.value,
    time: time.value,
    passengers: passengers.value,
    luggageBig: luggageBig.value,
    accessoryIds: Array.from(selectedAccessories.value),
  })
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement

  if (originOpen.value && !target.closest('.origin-dropdown')) {
    originOpen.value = false
  }

  if (destFocused.value && !target.closest('.dest-dropdown')) {
    destFocused.value = false
    destSuggestions.value = []
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    const data = await $fetch('/api/accessories')
    accessories.value = (data as Accessory[]).slice(0, 6)
  } catch { /* fallback: sin accesorios */ }
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
