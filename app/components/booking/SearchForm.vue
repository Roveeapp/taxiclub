<template>
  <div class="bg-white rounded-xl shadow-2xl p-md space-y-md">
    <!-- ORIGEN Selector (In-flow expansion) -->
    <div class="space-y-xs origin-dropdown">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase">Origen (Parada)</label>
      <button
        class="w-full flex items-center justify-between bg-surface-input px-md py-sm rounded-lg border-2 transition-all duration-200"
        :class="originOpen ? 'border-gold-accent' : 'border-transparent'"
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

    <!-- DESTINO Input -->
    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase">Destino</label>
      <div class="w-full flex items-center bg-surface-input px-md py-sm rounded-lg border border-slate-200">
        <Icon name="tabler:map-pin" size="18" class="text-slate-400 mr-sm" />
        <input
          v-model="destination"
          type="text"
          placeholder="Introduce destino..."
          class="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 font-body-md"
        />
      </div>
    </div>

    <!-- FECHA y HORA -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Fecha</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg border border-slate-200">
          <Icon name="tabler:calendar" size="18" class="text-slate-400 mr-xs" />
          <input v-model="date" type="date" :min="minDate" class="w-full bg-transparent border-none focus:ring-0 text-slate-900 text-xs" />
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Hora</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg border border-slate-200">
          <Icon name="tabler:clock" size="18" class="text-slate-400 mr-xs" />
          <input v-model="time" type="time" class="w-full bg-transparent border-none focus:ring-0 text-slate-900 text-xs" />
        </div>
      </div>
    </div>

    <!-- PASAJEROS y EQUIPAJE -->
    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Pasajeros</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg border border-slate-200">
          <Icon name="tabler:users" size="18" class="text-slate-400 mr-xs" />
          <select v-model.number="passengers" class="w-full bg-transparent border-none focus:ring-0 text-slate-900 text-xs appearance-none">
            <option v-for="n in 8" :key="n" :value="n">{{ n }} {{ n === 1 ? 'persona' : 'personas' }}</option>
          </select>
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-slate-500 uppercase">Equipaje</label>
        <div class="flex items-center bg-surface-input px-md py-sm rounded-lg border border-slate-200">
          <Icon name="tabler:luggage" size="18" class="text-slate-400 mr-xs" />
          <select v-model.number="luggageBig" class="w-full bg-transparent border-none focus:ring-0 text-slate-900 text-xs appearance-none">
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
const destination = ref('')
const date = ref('')
const time = ref('')
const passengers = ref(1)
const luggageBig = ref(0)
const originOpen = ref(false)
const accessories = ref<Accessory[]>([])
const selectedAccessories = ref(new Set<string>())

const minDate = computed(() => new Date().toISOString().split('T')[0])

const selectedStationName = computed(() =>
  props.stations.find(s => s.id === originStationId.value)?.name,
)

const isFormValid = computed(() =>
  originStationId.value && destination.value && date.value && time.value,
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
  if (!originOpen.value) return
  const target = e.target as HTMLElement
  const dropdown = target.closest('.origin-dropdown')
  if (!dropdown) {
    originOpen.value = false
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
