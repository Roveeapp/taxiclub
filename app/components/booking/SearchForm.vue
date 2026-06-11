<template>
  <div class="bg-white rounded-card p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="icon-wrap-dark">
        <Icon name="tabler:map-pin-2" size="16" class="text-brand-gold" />
      </div>
      <div class="flex-1">
        <span class="field-label block">DESDE · PARADA</span>
        <select
          :value="originStationId"
          class="w-full text-sm font-medium text-text-on-light bg-transparent border-none focus:outline-none cursor-pointer"
          @change="$emit('update:originStationId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Seleccionar parada</option>
          <option v-for="station in stations" :key="station.id" :value="station.id">
            {{ station.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <div class="icon-wrap-gold">
        <Icon name="tabler:map-pin" size="16" class="text-brand-dark" />
      </div>
      <div class="flex-1">
        <span class="field-label block">HASTA</span>
        <input
          :value="destination"
          type="text"
          placeholder="Dirección o parada de destino"
          class="w-full text-sm text-text-on-light bg-transparent border-none focus:outline-none placeholder:text-text-muted-light"
          @input="$emit('update:destination', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <span class="field-label block mb-1">FECHA</span>
        <input
          :value="date"
          type="date"
          :min="minDate"
          class="w-full bg-surface-input rounded-input px-3 py-2 text-sm text-text-on-light border border-transparent focus:border-brand-gold focus:outline-none"
          @input="$emit('update:date', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div>
        <span class="field-label block mb-1">HORA</span>
        <input
          :value="time"
          type="time"
          class="w-full bg-surface-input rounded-input px-3 py-2 text-sm text-text-on-light border border-transparent focus:border-brand-gold focus:outline-none"
          @input="$emit('update:time', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div>
        <span class="field-label block mb-2">PASAJEROS</span>
        <AppStepper v-model="passengers" :min="1" :max="8" />
      </div>
      <div>
        <span class="field-label block mb-2">MALETAS</span>
        <AppStepper v-model="luggageBig" :min="0" :max="5" />
      </div>
      <div>
        <span class="field-label block mb-2">MANO</span>
        <AppStepper v-model="luggageHand" :min="0" :max="10" />
      </div>
    </div>

    <div class="flex flex-wrap gap-2 mb-6">
      <AppChip v-model:active="needsChildSeat" icon="tabler:armchair">Silla bebé</AppChip>
      <AppChip v-model:active="needsPetFriendly" icon="tabler:paw">Mascota</AppChip>
      <AppChip v-model:active="needsAccessible" icon="tabler:wheelchair">PMR</AppChip>
      <AppChip v-model:active="needsLargeVehicle" icon="tabler:car">Vehículo grande</AppChip>
    </div>

    <AppButton :disabled="!isFormValid" @click="handleSearch">
      Buscar viaje
    </AppButton>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  stations?: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  search: [data: SearchFormData]
}>()

const originStationId = ref('')
const destination = ref('')
const date = ref('')
const time = ref('')
const passengers = ref(1)
const luggageBig = ref(0)
const luggageHand = ref(0)
const needsChildSeat = ref(false)
const needsPetFriendly = ref(false)
const needsAccessible = ref(false)
const needsLargeVehicle = ref(false)

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return originStationId.value && destination.value && date.value && time.value
})

interface SearchFormData {
  originStationId: string
  destination: string
  date: string
  time: string
  passengers: number
  luggageBig: number
  luggageHand: number
  needsChildSeat: boolean
  needsPetFriendly: boolean
  needsAccessible: boolean
  needsLargeVehicle: boolean
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
    luggageHand: luggageHand.value,
    needsChildSeat: needsChildSeat.value,
    needsPetFriendly: needsPetFriendly.value,
    needsAccessible: needsAccessible.value,
    needsLargeVehicle: needsLargeVehicle.value,
  })
}

onMounted(() => {
  if (!props.stations || props.stations.length === 0) {
    // TODO: Fetch stations from API
  }
})
</script>
