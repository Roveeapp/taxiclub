<template>
  <div class="bg-white rounded-card p-4 border border-gray-100">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="icon-wrap-subtle">
          <Icon name="tabler:steering-wheel" size="20" class="text-brand-gold" />
        </div>
        <div>
          <p class="text-sm font-semibold text-text-on-light">{{ vehicle.plate }}</p>
          <p class="text-xs text-text-muted-light">
            {{ vehicle.brand }} {{ vehicle.model }}
            <span v-if="vehicle.year"> · {{ vehicle.year }}</span>
          </p>
        </div>
      </div>
      <span
        class="text-[11px] font-semibold uppercase px-2 py-1 rounded"
        :class="vehicle.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'"
      >
        {{ vehicle.isActive ? 'Activo' : 'Inactivo' }}
      </span>
    </div>

    <div class="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-surface-divider">
      <div class="text-center">
        <Icon name="tabler:users" size="14" class="mx-auto text-text-muted-light mb-1" />
        <span class="text-xs text-text-on-light">{{ vehicle.maxPassengers }}</span>
      </div>
      <div class="text-center">
        <Icon name="tabler:luggage" size="14" class="mx-auto text-text-muted-light mb-1" />
        <span class="text-xs text-text-on-light">{{ vehicle.maxLuggageBig }}</span>
      </div>
      <div class="text-center">
        <Icon name="tabler:briefcase" size="14" class="mx-auto text-text-muted-light mb-1" />
        <span class="text-xs text-text-on-light">{{ vehicle.maxLuggageHand }}</span>
      </div>
      <div class="text-center">
        <span v-if="vehicle.color" class="w-4 h-4 rounded-full mx-auto border border-gray-200" :style="{ background: vehicle.color }" />
      </div>
    </div>

    <div v-if="hasExtras" class="flex flex-wrap gap-1 mt-3">
      <span v-for="acc in vehicle.accessories" :key="acc.id" class="text-[10px] bg-gold-50 text-gold-800 px-2 py-0.5 rounded-full">{{ acc.name }}</span>
      <span v-if="vehicle.hasChildSeat && !hasAccessory('Silla Bebé')" class="text-[10px] bg-gold-50 text-gold-800 px-2 py-0.5 rounded-full">Silla bebé</span>
      <span v-if="vehicle.hasPetFriendly && !hasAccessory('Mascotas')" class="text-[10px] bg-gold-50 text-gold-800 px-2 py-0.5 rounded-full">Mascota</span>
      <span v-if="vehicle.isAccessible && !hasAccessory('Accesible PMR')" class="text-[10px] bg-gold-50 text-gold-800 px-2 py-0.5 rounded-full">PMR</span>
      <span v-if="vehicle.isLargeVehicle && !hasAccessory('Vehículo Grande')" class="text-[10px] bg-gold-50 text-gold-800 px-2 py-0.5 rounded-full">Grande</span>
    </div>

    <div class="flex gap-2 mt-3 pt-3 border-t border-surface-divider">
      <NuxtLink
        :to="`/taxista/vehiculos/${vehicle.id}`"
        class="flex-1 text-center text-sm text-brand-gold hover:text-gold-600 py-1.5 rounded-lg hover:bg-gold-50 transition-colors"
      >
        Editar
      </NuxtLink>
      <button
        class="flex-1 text-center text-sm text-error hover:bg-red-50 py-1.5 rounded-lg transition-colors"
        @click="$emit('deactivate', vehicle.id)"
      >
        Desactivar
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  vehicle: any
}>()

defineEmits<{
  deactivate: [id: string]
}>()

const hasExtras = computed(() =>
  props.vehicle.hasChildSeat || props.vehicle.hasPetFriendly ||
  props.vehicle.isAccessible || props.vehicle.isLargeVehicle ||
  (Array.isArray(props.vehicle.accessories) && props.vehicle.accessories.length > 0),
)

function hasAccessory(name: string) {
  return Array.isArray(props.vehicle.accessories) && props.vehicle.accessories.some((a: any) => a.name === name)
}
</script>
