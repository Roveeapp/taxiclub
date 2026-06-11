<template>
  <div class="bg-white rounded-xl shadow-2xl p-md space-y-md">
    <!-- ORIGEN -->
    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Origen (Parada)</label>
      <Select
        v-model="originStationId"
        :options="stationOptions"
        option-label="name"
        option-value="id"
        placeholder="Seleccionar parada"
        class="w-full"
        :pt="selectPt"
        @change="onOriginChange"
      >
        <template #dropdownicon>
          <Icon name="tabler:chevron-down" size="18" class="text-slate-400" />
        </template>
      </Select>
    </div>

    <!-- DESTINO Autocomplete -->
    <div class="space-y-xs dest-dropdown">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Destino</label>
      <AutoComplete
        v-model="destQuery"
        :suggestions="destSuggestions"
        option-label="description"
        placeholder="Escribe una dirección..."
        class="w-full"
        :pt="autocompletePt"
        @complete="onDestSearch"
        @item-select="selectDest"
        @focus="destFocused = true"
        @blur="destFocused = false"
      >
        <template #option="{ option }">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
              <Icon :name="option.icon" size="18" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-body-md text-slate-900 font-semibold truncate">{{ option.label }}</p>
              <p class="font-label-caps text-on-primary-container truncate">{{ option.description }}</p>
            </div>
            <span v-if="option.source === 'saved'" class="text-[10px] bg-secondary/10 text-secondary px-xs py-0.5 rounded-full font-medium">Guardado</span>
          </div>
        </template>
      </AutoComplete>
    </div>

    <!-- FECHA y HORA -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Fecha</label>
        <DatePicker
          v-model="date"
          :min-date="minDateObj"
          date-format="dd/mm/yy"
          placeholder="Seleccionar"
          class="w-full"
          :pt="selectPt"
          show-icon
        >
          <template #dropdownicon>
            <Icon name="tabler:calendar" size="18" class="text-slate-400" />
          </template>
        </DatePicker>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Hora</label>
        <Select
          v-model="time"
          :options="timeSlots"
          option-label="label"
          option-value="value"
          placeholder="Seleccionar"
          class="w-full"
          :pt="selectPt"
        >
          <template #dropdownicon>
            <Icon name="tabler:clock" size="18" class="text-slate-400" />
          </template>
        </Select>
      </div>
    </div>

    <!-- PASAJEROS y EQUIPAJE -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Pasajeros</label>
        <Select
          v-model="passengers"
          :options="passengerOptions"
          option-label="label"
          option-value="value"
          placeholder="1 persona"
          class="w-full"
          :pt="selectPt"
        >
          <template #dropdownicon>
            <Icon name="tabler:users" size="18" class="text-slate-400" />
          </template>
        </Select>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase block">Equipaje</label>
        <Select
          v-model="luggageBig"
          :options="luggageOptions"
          option-label="label"
          option-value="value"
          placeholder="0 maletas"
          class="w-full"
          :pt="selectPt"
        >
          <template #dropdownicon>
            <Icon name="tabler:luggage" size="18" class="text-slate-400" />
          </template>
        </Select>
      </div>
    </div>

    <!-- Accesorios -->
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
    <Button
      :label="'Buscar Disponibilidad'"
      :disabled="!isFormValid"
      class="w-full"
      :pt="buttonPt"
      @click="handleSearch"
    />
  </div>
</template>

<script setup lang="ts">
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'

interface Accessory { id: string; name: string; icon: string }
interface Station { id: string; name: string }

const props = withDefaults(defineProps<{ stations?: Station[] }>(), { stations: () => [] })

const emit = defineEmits<{ search: [data: SearchFormData] }>()

const originStationId = ref('')
const destQuery = ref('')
const destination = ref('')
const destFocused = ref(false)
const destSuggestions = ref<Array<{ id: string; label: string; description: string; source: string; icon: string }>>([])
let destDebounce: ReturnType<typeof setTimeout> | null = null

const now = new Date()
const date = ref<Date>(now)
const time = ref('')
const passengers = ref(1)
const luggageBig = ref(0)
const accessories = ref<Accessory[]>([])
const selectedAccessories = ref(new Set<string>())

const minDateObj = computed(() => new Date())

const stationOptions = computed(() =>
  props.stations.map(s => ({ name: s.name, value: s.id })),
)

const passengerOptions = Array.from({ length: 8 }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i === 0 ? 'persona' : 'personas'}` }))
const luggageOptions = Array.from({ length: 7 }, (_, i) => ({ value: i, label: i === 0 ? 'Sin equipaje' : `${i} ${i === 1 ? 'maleta' : 'maletas'}` }))

const isFormValid = computed(() => !!originStationId.value && !!destQuery.value && !!time.value)

interface SearchFormData {
  originStationId: string
  destination: string
  date: string
  time: string
  passengers: number
  luggageBig: number
  accessoryIds: string[]
}

// PrimeVue passthrough styles matching Stitch design
const selectPt = {
  root: { class: '!bg-surface-input !rounded-lg !border-none' },
  input: { class: '!text-slate-900 !text-xs !p-0' },
  trigger: { class: '!text-slate-400' },
  overlay: { class: '!bg-white !border !border-slate-200 !rounded-lg !shadow-lg !mt-1' },
  option: { class: '!text-slate-700 !text-sm hover:!bg-slate-100' },
  optionCheckIcon: { class: '!text-secondary' },
  blank: { class: '!text-slate-400 !text-sm' },
}

const autocompletePt = {
  root: { class: '!bg-surface-input !rounded-lg !border-none' },
  input: { class: '!text-slate-900 !text-sm !p-0' },
  overlay: { class: '!bg-white !border !border-slate-200 !rounded-lg !shadow-lg !mt-1' },
  option: { class: '!p-0' },
}

const buttonPt = {
  root: { class: '!bg-secondary !text-on-secondary !font-bold !py-md !rounded-xl !border-none !text-sm' },
}

const timeSlots = computed(() => {
  const slots: Array<{ value: string; label: string }> = []
  const isToday = date.value.toDateString() === new Date().toDateString()
  const startMin = isToday
    ? new Date(Date.now() + 2 * 60 * 60 * 1000)
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

function onOriginChange() { /* handled by v-model */ }

function onDestSearch(event: { query: string }) {
  if (destDebounce) clearTimeout(destDebounce)
  destDebounce = setTimeout(async () => {
    if (event.query.length < 2) { destSuggestions.value = []; return }
    try {
      const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(event.query)}`)
      destSuggestions.value = data as any[]
    } catch { destSuggestions.value = [] }
  }, 300)
}

function selectDest(event: { value: { id: string; label: string; description: string } }) {
  destination.value = event.value.description
  destQuery.value = event.value.description
  destSuggestions.value = []
}

function toggleAccessory(id: string) {
  const next = new Set(selectedAccessories.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedAccessories.value = next
}

function handleSearch() {
  if (!isFormValid.value) return
  emit('search', {
    originStationId: originStationId.value,
    destination: destination.value,
    date: date.value.toISOString().split('T')[0],
    time: time.value,
    passengers: passengers.value,
    luggageBig: luggageBig.value,
    accessoryIds: Array.from(selectedAccessories.value),
  })
}

onMounted(async () => {
  if (timeSlots.value.length > 0) time.value = timeSlots.value[0].value

  try {
    const data = await $fetch('/api/accessories')
    accessories.value = (data as Accessory[]).slice(0, 6)
  } catch { /* ok */ }
})

watch(date, () => {
  if (timeSlots.value.length > 0) time.value = timeSlots.value[0].value
})
</script>
