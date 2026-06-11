<template>
  <div class="bg-white rounded-xl shadow-2xl p-lg space-y-md relative overflow-hidden active-scale">
    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-primary-container block">ORIGEN (PARADA)</label>
      <div class="flex items-center bg-surface-input rounded-lg px-md py-sm border-2 border-transparent focus-within:border-secondary transition-all">
        <Icon name="tabler:map-pin-filled" size="18" class="text-primary-container mr-sm" />
        <select
          :value="originStationId"
          class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md appearance-none"
          @change="$emit('update:originStationId', ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>Seleccionar parada</option>
          <option v-for="station in stations" :key="station.id" :value="station.id">
            {{ station.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="space-y-xs">
      <label class="font-label-caps text-label-caps text-primary-container block">DESTINO FINAL</label>
      <div class="flex items-center bg-surface-input rounded-lg px-md py-sm border-2 border-transparent focus-within:border-secondary transition-all">
        <Icon name="tabler:search" size="18" class="text-primary-container mr-sm" />
        <input
          :value="destination"
          type="text"
          placeholder="Calle, ciudad o lugar..."
          class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md"
          @input="$emit('update:destination', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-primary-container block">FECHA</label>
        <div class="flex items-center bg-surface-input rounded-lg px-md py-sm">
          <Icon name="tabler:calendar" size="18" class="text-primary-container mr-xs" />
          <input
            :value="date"
            type="date"
            :min="minDate"
            class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md text-xs"
            @input="$emit('update:date', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-primary-container block">HORA</label>
        <div class="flex items-center bg-surface-input rounded-lg px-md py-sm">
          <Icon name="tabler:clock" size="18" class="text-primary-container mr-xs" />
          <input
            :value="time"
            type="time"
            class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md text-xs"
            @input="$emit('update:time', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-sm">
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-primary-container block">PASAJEROS</label>
        <div class="flex items-center bg-surface-input rounded-lg px-md py-sm">
          <Icon name="tabler:users" size="18" class="text-primary-container mr-xs" />
          <select
            :value="passengers"
            class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md text-xs appearance-none"
            @change="$emit('update:passengers', parseInt(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="n in 8" :key="n" :value="n">{{ n }} {{ n === 1 ? 'persona' : 'personas' }}</option>
          </select>
        </div>
      </div>
      <div class="space-y-xs">
        <label class="font-label-caps text-label-caps text-primary-container block">MALETAS</label>
        <div class="flex items-center bg-surface-input rounded-lg px-md py-sm">
          <Icon name="tabler:luggage" size="18" class="text-primary-container mr-xs" />
          <select
            :value="luggageBig"
            class="w-full bg-transparent border-none focus:ring-0 text-primary-container font-body-md text-xs appearance-none"
            @change="$emit('update:luggageBig', parseInt(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="n in 6" :key="n" :value="n">{{ n }} {{ n === 1 ? 'maleta' : 'maletas' }}</option>
          </select>
        </div>
      </div>
    </div>

    <AppButton
      variant="gold"
      :disabled="!isFormValid"
      @click="handleSearch"
    >
      RESERVAR AHORA
      <Icon name="tabler:arrow-right" size="18" class="ml-2" />
    </AppButton>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  stations?: Array<{ id: string; name: string }>
  originStationId?: string
  destination?: string
  date?: string
  time?: string
  passengers?: number
  luggageBig?: number
}>(), {
  stations: () => [],
  originStationId: '',
  destination: '',
  date: '',
  time: '',
  passengers: 1,
  luggageBig: 0,
})

const emit = defineEmits<{
  search: [data: SearchFormData]
  'update:originStationId': [value: string]
  'update:destination': [value: string]
  'update:date': [value: string]
  'update:time': [value: string]
  'update:passengers': [value: number]
  'update:luggageBig': [value: number]
}>()

const minDate = computed(() => new Date().toISOString().split('T')[0])

const isFormValid = computed(() =>
  props.originStationId && props.destination && props.date && props.time,
)

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
    originStationId: props.originStationId,
    destination: props.destination,
    date: props.date,
    time: props.time,
    passengers: props.passengers,
    luggageBig: props.luggageBig,
    luggageHand: 0,
    needsChildSeat: false,
    needsPetFriendly: false,
    needsAccessible: false,
    needsLargeVehicle: false,
  })
}
</script>
