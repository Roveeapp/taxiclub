<template>
  <div class="bg-white rounded-card shadow-2xl shadow-black/30 p-md space-y-md">
    <!-- ORIGEN (texto libre con sugerencias: paradas + direcciones) -->
    <div class="space-y-1">
      <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Origen</label>
      <div class="relative flex items-center" style="height: 3rem;">
        <div class="absolute left-4 z-10 pointer-events-none" style="top: 50%; transform: translateY(-50%);">
          <Icon name="tabler:map-pin-2" size="18" class="text-secondary" />
        </div>
        <AutoComplete
          v-model="originQuery"
          :suggestions="originSuggestions"
          option-label="description"
          placeholder="¿Dónde te recogemos?"
          class="w-full"
          variant="filled"
          append-to="self"
          :delay="400"
          :min-length="3"
          @complete="onOriginSearch"
          @item-select="selectOrigin"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                <Icon :name="option.source === 'station' ? 'tabler:map-pin-2' : 'tabler:map-pin'" size="18" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">{{ option.label }}</p>
                <p class="text-xs text-slate-500 truncate">{{ option.description }}</p>
              </div>
              <span v-if="option.source === 'station'" class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">Parada</span>
            </div>
          </template>
        </AutoComplete>
      </div>
    </div>

    <!-- DESTINO -->
    <div class="space-y-1">
      <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Destino</label>
        <div class="relative flex items-center" style="height: 3rem;">
          <div class="absolute left-4 z-10 pointer-events-none" style="top: 50%; transform: translateY(-50%);">
            <Icon name="tabler:search" size="18" class="text-secondary" />
          </div>
        <AutoComplete
          v-model="destQuery"
          :suggestions="destSuggestions"
          option-label="description"
          placeholder="Escribe una dirección..."
          class="w-full"
          variant="filled"
          append-to="self"
          :delay="400"
          :min-length="3"
          @complete="onDestSearch"
          @item-select="selectDest"
          @focus="destFocused = true"
          @blur="destFocused = false"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                <Icon :name="option.source === 'station' ? 'tabler:map-pin-2' : 'tabler:map-pin'" size="18" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">{{ option.label }}</p>
                <p class="text-xs text-slate-500 truncate">{{ option.description }}</p>
              </div>
              <span v-if="option.source === 'station'" class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">Parada</span>
              <span v-else-if="option.source === 'saved'" class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">Guardado</span>
            </div>
          </template>
        </AutoComplete>
      </div>
    </div>

    <!-- FECHA y HORA -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Fecha</label>
        <div class="relative flex items-center" style="height: 3rem;">
          <div class="absolute left-4 z-10 pointer-events-none" style="top: 50%; transform: translateY(-50%);">
            <Icon name="tabler:calendar" size="18" class="text-secondary" />
          </div>
          <DatePicker
            v-model="date"
            :min-date="minDateObj"
            date-format="dd/mm/yy"
            placeholder="Seleccionar"
            class="w-full"
            variant="filled"
            append-to="self"
          >
            <template #dropdownicon>
              <Icon name="tabler:chevron-down" size="18" class="text-secondary" />
            </template>
          </DatePicker>
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Hora</label>
        <Select
          v-model="time"
          :options="timeSlots"
          option-label="label"
          option-value="value"
          placeholder="Seleccionar"
          class="w-full"
          variant="filled"
          append-to="self"
        >
          <template #value="slotProps">
            <div class="flex items-center gap-3">
              <Icon name="tabler:clock" size="18" class="text-secondary flex-shrink-0" />
              <span class="text-sm font-medium text-slate-900">
                {{ timeSlots.find(s => s.value === slotProps.value)?.label || slotProps.placeholder }}
              </span>
            </div>
          </template>
          <template #dropdownicon>
            <Icon name="tabler:chevron-down" size="18" class="text-slate-400" />
          </template>
        </Select>
      </div>
    </div>

    <!-- PASAJEROS y EQUIPAJE -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Pasajeros</label>
        <div class="flex items-center gap-3 bg-white border-2 border-secondary rounded-xl px-4 h-12">
          <Icon name="tabler:users" size="18" class="text-secondary flex-shrink-0" />
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-secondary/15 text-secondary hover:bg-secondary/25 text-sm font-bold flex items-center justify-center transition-colors"
            :disabled="passengers <= 1"
            @click="passengers--"
          >
            -
          </button>
          <span class="text-sm font-medium text-slate-900 w-6 text-center">{{ passengers }}</span>
          <button
            type="button"
            class="w-8 h-8 rounded-full bg-secondary/15 text-secondary hover:bg-secondary/25 text-sm font-bold flex items-center justify-center transition-colors"
            :disabled="passengers >= 8"
            @click="passengers++"
          >
            +
          </button>
        </div>
      </div>
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] block">Equipaje</label>
        <div
          class="flex items-center gap-3 bg-white border-2 border-secondary rounded-xl px-4 h-12 cursor-pointer overflow-hidden"
          @click="luggageDialogVisible = true"
        >
          <Icon name="tabler:luggage" size="18" class="text-secondary flex-shrink-0" />
          <span class="text-sm font-medium text-slate-900 flex-1 truncate whitespace-nowrap">{{ luggageSummary }}</span>
          <Icon name="tabler:chevron-down" size="18" class="text-slate-400 flex-shrink-0" />
        </div>
      </div>

      <LuggageSelector
        v-model:visible="luggageDialogVisible"
        :initial-big="luggageBig"
        :initial-hand="luggageHand"
        @confirm="(b, h) => { luggageBig = b; luggageHand = h }"
      />
    </div>

    <!-- Accesorios -->
    <div class="flex flex-wrap gap-2 pt-2">
      <button
        v-for="acc in accessories"
        :key="acc.id"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all"
        :class="selectedAccessories.has(acc.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="toggleAccessory(acc.id)"
      >
        <Icon :name="acc.icon" size="14" :class="selectedAccessories.has(acc.id) ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-xs font-medium">{{ acc.name }}</span>
      </button>
    </div>

    <!-- CTA -->
    <button
      class="w-full bg-secondary text-on-secondary font-bold py-4 rounded-btn text-sm transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="!isFormValid"
      @click="handleSearch"
    >
      Buscar Disponibilidad
    </button>
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import DatePicker from 'primevue/datepicker'

interface Accessory { id: string; name: string; icon: string }
interface Station { id: string; name: string }

const props = withDefaults(defineProps<{ stations?: Station[] }>(), { stations: () => [] })
const emit = defineEmits<{ search: [data: SearchFormData] }>()

const { minAdvanceHours, load: loadConfig } = useSystemConfig()

// Origen libre: texto con sugerencias (paradas registradas + direcciones)
const originStationId = ref('')
const originQuery = ref<string | { description?: string, label?: string }>('')
// Las sugerencias ya vienen con coordenadas del autocompletado. Guardarlas
// ahorra al servidor una llamada a Nominatim que puede fallar en silencio y
// dejar la reserva sin coordenadas —y sin coordenadas la asignación por zonas
// del conductor se degrada sin que nadie se entere.
const originCoords = ref<{ lat: number, lng: number } | null>(null)
const originSuggestions = ref<Array<{ id: string, label: string, description: string, source: string, lat?: number, lng?: number }>>([])
let originDebounce: ReturnType<typeof setTimeout> | null = null

const effectiveOrigin = computed(() => {
  const q = originQuery.value
  if (typeof q === 'string') return q.trim()
  return (q?.description || q?.label || '').trim()
})

function onOriginSearch(event: { query: string }) {
  if (originDebounce) clearTimeout(originDebounce)
  originDebounce = setTimeout(async () => {
    const q = event.query.toLowerCase()
    // Paradas registradas que coincidan, primero
    const stationMatches = props.stations
      .filter(s => s.name.toLowerCase().includes(q))
      .map(s => ({ id: s.id, label: s.name, description: s.name, source: 'station' }))

    if (q.length < 2) {
      originSuggestions.value = stationMatches
      return
    }
    try {
      const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(event.query)}`) as any[]
      originSuggestions.value = [...stationMatches, ...(data || [])]
    } catch {
      originSuggestions.value = stationMatches
    }
  }, 300)
}

function selectOrigin(event: { value: { id: string, label: string, description: string, source: string, lat?: number, lng?: number } }) {
  const v = event.value
  originQuery.value = v.source === 'station' ? v.label : v.description
  // Si eligió una parada registrada, la aprovechamos para tarifas fijas y round-robin
  originStationId.value = v.source === 'station' ? v.id : ''
  originCoords.value = typeof v.lat === 'number' && typeof v.lng === 'number'
    ? { lat: v.lat, lng: v.lng }
    : null
  originSuggestions.value = []
}

const destQuery = ref<string | { description?: string, label?: string }>('')
const destination = ref('')
// El destino no ofrecía las paradas registradas —solo el origen lo hacía—, así
// que el cliente no tenía forma de decir «voy a la estación de Oviedo». El
// servidor lo adivinaba con un `includes` sobre el texto y se equivocaba en las
// dos direcciones: ataba «Calle Uría, Pravia» a la parada de Pravia y no
// reconocía «Oviedo — RENFE» por la raya del nombre.
const destinationStationId = ref('')
const destinationCoords = ref<{ lat: number, lng: number } | null>(null)

// El usuario puede escribir el destino sin elegir sugerencia:
// usamos siempre el texto actual como destino efectivo.
const effectiveDestination = computed(() => {
  const q = destQuery.value
  if (typeof q === 'string') return q.trim()
  return (q?.description || q?.label || '').trim()
})
const destFocused = ref(false)
const destSuggestions = ref<Array<{ id: string; label: string; description: string; source: string; icon?: string; lat?: number; lng?: number }>>([])
let destDebounce: ReturnType<typeof setTimeout> | null = null

const now = new Date()
const date = ref<Date>(now)
const time = ref('')
const passengers = ref(1)
const luggageBig = ref(0)
const luggageHand = ref(0)
const luggageDialogVisible = ref(false)
const accessories = ref<Accessory[]>([])
const selectedAccessories = ref(new Set<string>())

const minDateObj = computed(() => new Date())

// Si el usuario edita el texto tras elegir una parada, deja de ser esa parada.
// Y tampoco valen ya las coordenadas: eran las del sitio anterior, y unas
// coordenadas equivocadas son peor que ninguna, porque el servidor se las cree.
watch(originQuery, (q) => {
  if (typeof q !== 'string') return
  if (originStationId.value) {
    const station = props.stations.find(s => s.id === originStationId.value)
    if (!station || station.name !== q) {
      originStationId.value = ''
      originCoords.value = null
    }
  } else if (originCoords.value && q.trim() !== effectiveOrigin.value) {
    originCoords.value = null
  }
})

// El mismo criterio en el destino, que es donde la parada decide la tarifa fija
watch(destQuery, (q) => {
  if (typeof q !== 'string') return
  const texto = q.trim()
  if (destinationStationId.value) {
    const station = props.stations.find(s => s.id === destinationStationId.value)
    if (!station || station.name !== texto) {
      destinationStationId.value = ''
      destinationCoords.value = null
    }
  } else if (destinationCoords.value && texto !== destination.value) {
    destinationCoords.value = null
  }
})

const luggageSummary = computed(() => {
  const parts: string[] = []
  if (luggageBig.value > 0) parts.push(`${luggageBig.value} ${luggageBig.value === 1 ? 'maleta G' : 'maletas G'}`)
  if (luggageHand.value > 0) parts.push(`${luggageHand.value} ${luggageHand.value === 1 ? 'equipaje M' : 'equipajes M'}`)
  if (parts.length === 0) return 'Sin equipaje'
  return parts.join(' + ')
})

const isFormValid = computed(() =>
  (effectiveOrigin.value.length >= 3 || !!originStationId.value)
  && effectiveDestination.value.length >= 3
  && !!time.value,
)

interface SearchFormData {
  originStationId: string
  originAddress: string
  originLat: number | null
  originLng: number | null
  destination: string
  destinationStationId: string
  destinationLat: number | null
  destinationLng: number | null
  date: string
  time: string
  passengers: number
  luggageBig: number
  luggageHand: number
  accessoryIds: string[]
}

const timeSlots = computed(() => {
  const slots: Array<{ value: string; label: string }> = []
  const isToday = date.value.toDateString() === new Date().toDateString()
  const startMin = isToday
    ? new Date(Date.now() + (minAdvanceHours.value || 2) * 60 * 60 * 1000)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0)

  const startH = startMin.getHours()
  const startM = Math.ceil(startMin.getMinutes() / 15) * 15
  const begin = new Date(startMin)
  begin.setHours(startH, startM === 60 ? 0 : startM, 0, 0)
  if (startM === 60) begin.setHours(startH + 1, 0, 0, 0)

  const end = new Date(begin)
  end.setHours(23, 59, 0, 0)
  while (begin <= end) {
    const h = begin.getHours().toString().padStart(2, '0')
    const m = begin.getMinutes().toString().padStart(2, '0')
    slots.push({ value: `${h}:${m}`, label: `${h}:${m}h` })
    begin.setMinutes(begin.getMinutes() + 15)
  }
  return slots
})

function onDestSearch(event: { query: string }) {
  if (destDebounce) clearTimeout(destDebounce)
  destDebounce = setTimeout(async () => {
    const q = event.query.toLowerCase()
    // Paradas registradas primero, igual que en el origen
    const stationMatches = props.stations
      .filter(s => s.name.toLowerCase().includes(q))
      .map(s => ({ id: s.id, label: s.name, description: s.name, source: 'station' }))

    if (event.query.length < 2) { destSuggestions.value = stationMatches; return }
    try {
      const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(event.query)}`) as any[]
      destSuggestions.value = [...stationMatches, ...(data || [])]
    } catch { destSuggestions.value = stationMatches }
  }, 300)
}

function selectDest(event: { value: { id: string; label: string; description: string; source?: string; lat?: number; lng?: number } }) {
  const v = event.value
  const texto = v.source === 'station' ? v.label : v.description
  destination.value = texto
  destQuery.value = texto
  // Que el cliente elija la parada es lo que evita que el servidor la adivine
  destinationStationId.value = v.source === 'station' ? v.id : ''
  destinationCoords.value = typeof v.lat === 'number' && typeof v.lng === 'number'
    ? { lat: v.lat, lng: v.lng }
    : null
  destSuggestions.value = []
}

function toggleAccessory(id: string) {
  const next = new Set(selectedAccessories.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedAccessories.value = next
}

function handleSearch() {
  if (!isFormValid.value) return
  emit('search', {
    originStationId: originStationId.value,
    originAddress: effectiveOrigin.value,
    originLat: originCoords.value?.lat ?? null,
    originLng: originCoords.value?.lng ?? null,
    destination: effectiveDestination.value || destination.value,
    destinationStationId: destinationStationId.value,
    destinationLat: destinationCoords.value?.lat ?? null,
    destinationLng: destinationCoords.value?.lng ?? null,
    date: date.value.toISOString().split('T')[0] ?? '',
    time: time.value,
    passengers: passengers.value,
    luggageBig: luggageBig.value,
    luggageHand: luggageHand.value,
    accessoryIds: Array.from(selectedAccessories.value),
  })
}

onMounted(async () => {
  loadConfig()
  if (timeSlots.value.length > 0 && timeSlots.value[0]) time.value = timeSlots.value[0].value

  try {
    const data = await $fetch('/api/accessories')
    accessories.value = (data as Accessory[]).slice(0, 6)
  } catch { /* ok */ }
})

watch(date, () => {
  if (timeSlots.value.length > 0 && timeSlots.value[0]) time.value = timeSlots.value[0].value
})
</script>

<style scoped>
:deep(.p-select) {
  border: 2px solid var(--secondary) !important;
  border-radius: 0.75rem !important;
  background: white !important;
  padding: 0 !important;
  min-height: 3rem !important;
  display: flex !important;
  align-items: center !important;
}
:deep(.p-select-label) {
  padding: 0 0.75rem !important;
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  color: #0f172a !important;
  display: flex !important;
  align-items: center !important;
  min-height: 2.75rem !important;
}
:deep(.p-select-dropdown) {
  background: transparent !important;
  border: none !important;
  width: 2.5rem !important;
  height: 2.5rem !important;
  color: #94a3b8 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-right: 0.25rem !important;
}
:deep(.p-select-overlay) {
  border: 1px solid #e2e8f0 !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  margin-top: 0.5rem !important;
}
:deep(.p-select-option) {
  padding: 0.625rem 1rem !important;
  font-size: 0.875rem !important;
  color: #334155 !important;
  border-radius: 0.5rem !important;
  margin: 0 0.5rem !important;
  margin-bottom: 0.125rem !important;
  cursor: pointer !important;
}
:deep(.p-select-option:hover) {
  background: #fffbeb !important;
}
:deep(.p-select-option-selected) {
  background: #fef3c7 !important;
  color: #0f172a !important;
}

:deep(.p-autocomplete) {
  border: 2px solid var(--secondary) !important;
  border-radius: 0.75rem !important;
  background: white !important;
  padding: 0 !important;
  min-height: 3rem !important;
  display: flex !important;
  align-items: center !important;
}
:deep(.p-autocomplete-input) {
  padding: 0 0.75rem 0 2.5rem !important;
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  color: #0f172a !important;
  display: flex !important;
  align-items: center !important;
  min-height: 2.75rem !important;
}
:deep(.p-autocomplete-dropdown) {
  background: transparent !important;
  border: none !important;
  width: 2.5rem !important;
  height: 2.5rem !important;
  color: #94a3b8 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin-right: 0.25rem !important;
}
:deep(.p-autocomplete-overlay) {
  border: 1px solid #e2e8f0 !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
  margin-top: 0.5rem !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}

:deep(.p-datepicker) {
  border: 2px solid var(--secondary) !important;
  border-radius: 0.75rem !important;
  background: white !important;
  padding: 0 !important;
  min-height: 3rem !important;
  display: flex !important;
  align-items: center !important;
}
:deep(.p-datepicker-input) {
  padding: 0 0.75rem 0 2.5rem !important;
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  font-size: 0.875rem !important;
  font-weight: 500 !important;
  color: #0f172a !important;
  display: flex !important;
  align-items: center !important;
  min-height: 2.75rem !important;
}
:deep(.p-datepicker-dropdown) {
  background: transparent !important;
  border: none !important;
  width: 2.5rem !important;
  height: 2.5rem !important;
  color: #94a3b8 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  order: -1 !important;
  margin-left: 0.5rem !important;
  margin-right: 0 !important;
}
</style>
