<template>
  <div class="bg-white rounded-card p-5 border border-gray-100">
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="icon-wrap-dark">
          <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
        </div>
        <span class="text-sm font-medium text-text-on-light">{{ booking.originStationName }}</span>
      </div>
      <AppBadge :variant="statusVariant" :label="statusLabel" />
    </div>

    <div class="flex items-center gap-2 mb-3">
      <div class="icon-wrap-gold">
        <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
      </div>
      <span class="text-sm text-text-on-light">{{ booking.destinationAddress }}</span>
    </div>

    <div class="flex items-center gap-4 text-xs text-text-muted-light mb-3">
      <span class="flex items-center gap-1">
        <Icon name="tabler:calendar" size="14" />
        {{ formattedDate }}
      </span>
      <span class="flex items-center gap-1">
        <Icon name="tabler:clock" size="14" />
        {{ formattedTime }}
      </span>
    </div>

    <div v-if="booking.confirmedPlate" class="flex items-center justify-between pt-3 border-t border-surface-divider">
      <div class="flex items-center gap-2">
        <Icon name="tabler:steering-wheel" size="16" class="text-text-muted-light" />
        <span class="text-sm font-medium text-text-on-light">{{ booking.confirmedPlate }}</span>
      </div>
      <a
        v-if="booking.confirmedPhone"
        :href="`tel:${booking.confirmedPhone}`"
        class="flex items-center gap-1 text-brand-gold hover:text-gold-600 transition-colors"
        aria-label="Llamar al conductor"
      >
        <Icon name="tabler:phone-call" size="16" />
        <span class="text-sm font-medium">Llamar</span>
      </a>
    </div>

    <div v-else-if="showPending" class="pt-3 border-t border-surface-divider">
      <div class="flex items-center gap-2 text-text-muted-light">
        <Icon name="tabler:loader" size="16" class="animate-spin" />
        <span class="text-xs">Pendiente de asignar vehículo</span>
      </div>
    </div>

    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center gap-3 text-xs text-text-muted-light">
        <span class="flex items-center gap-1">
          <Icon name="tabler:users" size="14" />
          {{ booking.passengers }}
        </span>
        <span v-if="booking.luggageBig" class="flex items-center gap-1">
          <Icon name="tabler:luggage" size="14" />
          {{ booking.luggageBig }}
        </span>
      </div>
      <span class="text-sm font-semibold text-text-on-light">{{ formattedPrice }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  booking: any
  showPending?: boolean
}>(), {
  showPending: true,
})

const statusVariant = computed(() => {
  switch (props.booking.status) {
    case 'pending': return 'pending'
    case 'confirmed': return 'confirmed'
    case 'completed': return 'completed'
    case 'cancelled': return 'cancelled'
    default: return 'pending'
  }
})

const statusLabel = computed(() => {
  switch (props.booking.status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return props.booking.status
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.booking.pickupAt || props.booking.pickup_at)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
})

const formattedTime = computed(() => {
  const date = new Date(props.booking.pickupAt || props.booking.pickup_at)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
})

const formattedPrice = computed(() => {
  const price = props.booking.totalPrice || props.booking.total_price
  return `${Number(price).toFixed(2)} €`
})
</script>
