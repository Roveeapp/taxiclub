<template>
  <div class="bg-white rounded-xl shadow-2xl p-md space-y-md">
    <!-- ORIGEN Selector (In-flow expansion) -->
    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase">Origen (Parada)</label>
      <button
        class="w-full flex items-center justify-between bg-surface-input px-md py-sm rounded-lg border-2 transition-all duration-200"
        :class="originOpen ? 'border-secondary' : 'border-transparent'"
        @click="originOpen = !originOpen"
      >
        <div class="flex items-center gap-sm">
          <Icon :name="originStationId ? 'tabler:map-pin-filled' : 'tabler:map-pin'" size="18" :class="originStationId ? 'text-secondary' : 'text-slate-400'" />
          <span :class="originStationId ? 'text-slate-900 font-medium' : 'text-slate-400'">
            {{ selectedStationName || 'Seleccionar parada' }}
          </span>
        </div>
        <Icon name="tabler:chevron-down" size="18" class="text-slate-400 transition-transform" :class="{ 'rotate-180': originOpen }" />
      </button>
      <!-- Expanded List -->
      <div v-if="originOpen" class="mt-xs bg-slate-50 rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
        <div
          v-for="station in stations"
          :key="station.id"
          class="px-md py-sm flex items-center gap-sm cursor-pointer transition-colors"
          :class="station.id === originStationId ? 'bg-secondary/10' : 'hover:bg-slate-100'"
          @click="selectOrigin(station)"
        >
          <Icon :name="station.id === originStationId ? 'tabler:map-pin-filled' : 'tabler:map-pin'" size="18" :class="station.id === originStationId ? 'text-secondary' : 'text-slate-400'" />
          <span :class="station.id === originStationId ? 'text-slate-900 font-semibold' : 'text-slate-700'">
            {{ station.name }}
          </span>
          <Icon v-if="station.id === originStationId" name="tabler:check" size="16" class="text-secondary ml-auto" />
        </div>
      </div>
    </div>

    <!-- DESTINO Input -->
    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-slate-500 uppercase">Destino</label>
      <div class="w-full flex items-center justify-between bg-surface-input px-md py-sm rounded-lg border border-slate-200">
        <div class="flex items-center gap-sm">
          <Icon name="tabler:map-pin" size="18" class="text-slate-400" />
          <input
            :value="destination"
            type="text"
            placeholder="Introduce destino..."
            class="w-full bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 font-body-md"
            @input="$emit('update:destination', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <Icon name="tabler:chevron-down" size="18" class="text-slate-400" />
      </div>
    </div>

    <!-- Toggles / Chips de accesorios -->
    <div class="flex flex-wrap gap-xs pt-xs">
      <button
        class="flex items-center gap-xs px-sm py-xs rounded-full border transition-all"
        :class="needsChildSeat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="needsChildSeat = !needsChildSeat"
      >
        <Icon name="tabler:armchair" size="14" :class="needsChildSeat ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-[12px] font-medium">Silla Bebé</span>
      </button>
      <button
        class="flex items-center gap-xs px-sm py-xs rounded-full border transition-all"
        :class="needsPetFriendly ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="needsPetFriendly = !needsPetFriendly"
      >
        <Icon name="tabler:paw" size="14" :class="needsPetFriendly ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-[12px] font-medium">Mascotas</span>
      </button>
      <button
        class="flex items-center gap-xs px-sm py-xs rounded-full border transition-all"
        :class="needsAccessible ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="needsAccessible = !needsAccessible"
      >
        <Icon name="tabler:wheelchair" size="14" :class="needsAccessible ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-[12px] font-medium">Accesible</span>
      </button>
      <button
        class="flex items-center gap-xs px-sm py-xs rounded-full border transition-all"
        :class="needsLargeVehicle ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'"
        @click="needsLargeVehicle = !needsLargeVehicle"
      >
        <Icon name="tabler:car" size="14" :class="needsLargeVehicle ? 'text-secondary' : 'text-slate-400'" />
        <span class="text-[12px] font-medium">Extra Equipaje</span>
      </button>
    </div>

    <!-- CTA Button -->
    <AppButton
      variant="gold"
      :disabled="!isFormValid"
      @click="handleSearch"
    >
      Buscar Disponibilidad
    </AppButton>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  stations?: Array<{ id: string; name: string }>
  originStationId?: string
  destination?: string
}>(), {
  stations: () => [],
  originStationId: '',
  destination: '',
})

const emit = defineEmits<{
  search: [data: SearchFormData]
  'update:originStationId': [value: string]
  'update:destination': [value: string]
}>()

const originOpen = ref(false)
const needsChildSeat = ref(false)
const needsPetFriendly = ref(false)
const needsAccessible = ref(false)
const needsLargeVehicle = ref(false)

const selectedStationName = computed(() =>
  props.stations.find(s => s.id === props.originStationId)?.name,
)

const isFormValid = computed(() =>
  props.originStationId && props.destination,
)

interface SearchFormData {
  originStationId: string
  destination: string
  needsChildSeat: boolean
  needsPetFriendly: boolean
  needsAccessible: boolean
  needsLargeVehicle: boolean
}

function selectOrigin(station: { id: string; name: string }) {
  emit('update:originStationId', station.id)
  originOpen.value = false
}

function handleSearch() {
  if (!isFormValid.value) return
  emit('search', {
    originStationId: props.originStationId,
    destination: props.destination,
    needsChildSeat: needsChildSeat.value,
    needsPetFriendly: needsPetFriendly.value,
    needsAccessible: needsAccessible.value,
    needsLargeVehicle: needsLargeVehicle.value,
  })
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.space-y-xs') && originOpen.value) {
    originOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
