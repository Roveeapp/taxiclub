<template>
  <div class="bg-white rounded-card p-6">
    <h3 class="text-lg font-medium text-text-on-light mb-4">Crear oferta de retorno</h3>

    <div class="space-y-4">
      <AppInput
        v-model="form.originAddress"
        label="Origen"
        placeholder="Dirección de recogida"
      />

      <AppDropdown
        v-model="form.destinationStationId"
        :options="stationOptions"
        label="Destino · Parada base"
        placeholder="Seleccionar parada"
        icon="ti:map-pin"
      />

      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class="field-label block mb-1">Disponible desde</span>
          <input
            v-model="form.availableFrom"
            type="datetime-local"
            class="w-full bg-surface-input rounded-input px-3 py-2 text-sm text-text-on-light border border-transparent focus:border-brand-gold focus:outline-none"
          />
        </div>
        <div>
          <span class="field-label block mb-1">Disponible hasta</span>
          <input
            v-model="form.availableUntil"
            type="datetime-local"
            class="w-full bg-surface-input rounded-input px-3 py-2 text-sm text-text-on-light border border-transparent focus:border-brand-gold focus:outline-none"
          />
        </div>
      </div>

      <div>
        <span class="field-label block mb-2">Descuento: {{ form.discountPct }}%</span>
        <input
          v-model.number="form.discountPct"
          type="range"
          min="0"
          max="40"
          step="5"
          class="w-full accent-brand-gold"
        />
        <div class="flex justify-between text-xs text-text-muted-light mt-1">
          <span>0%</span>
          <span>40%</span>
        </div>
      </div>

      <div class="flex items-center justify-between p-3 bg-surface-input rounded-input">
        <span class="text-sm text-text-muted-light">Precio estimado</span>
        <span class="text-lg font-semibold text-text-on-light">{{ formattedPrice }}</span>
      </div>

      <div>
        <span class="field-label block mb-2">Plazas disponibles</span>
        <AppStepper v-model="form.maxPassengers" :min="1" :max="8" />
      </div>

      <AppButton @click="handleSubmit" :loading="submitting">
        Publicar oferta
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  stations?: Array<{ id: string; name: string }>
  initialOrigin?: string
  initialDestinationStationId?: string
  basePrice?: number
}>()

const emit = defineEmits<{
  submit: [data: any]
}>()

const submitting = ref(false)

const form = reactive({
  originAddress: props.initialOrigin || '',
  destinationStationId: props.initialDestinationStationId || '',
  availableFrom: '',
  availableUntil: '',
  discountPct: 0,
  maxPassengers: 4,
})

const stationOptions = computed(() =>
  (props.stations || []).map(s => ({ value: s.id, label: s.name, icon: 'ti:map-pin' })),
)

const formattedPrice = computed(() => {
  const base = props.basePrice || 25
  const finalPrice = base * (1 - form.discountPct / 100)
  return `${finalPrice.toFixed(2)} €`
})

async function handleSubmit() {
  submitting.value = true
  try {
    emit('submit', { ...form })
  } finally {
    submitting.value = false
  }
}
</script>
