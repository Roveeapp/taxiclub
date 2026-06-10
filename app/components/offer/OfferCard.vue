<template>
  <div class="bg-surface-card border border-surface-card-border rounded-card p-4">
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="icon-wrap-subtle">
          <Icon name="ti:bolt" size="20" class="text-brand-gold" />
        </div>
        <div>
          <p class="text-sm font-medium text-white">{{ offer.originAddress }}</p>
          <p class="text-xs text-white/45">→ {{ offer.destinationStationName }}</p>
        </div>
      </div>
      <span v-if="offer.discountPct > 0" class="badge-discount">
        -{{ offer.discountPct }}%
      </span>
    </div>

    <div class="flex items-center gap-4 text-xs text-white/45 mb-3">
      <span class="flex items-center gap-1">
        <Icon name="ti:clock" size="14" />
        {{ timeWindow }}
      </span>
      <span class="flex items-center gap-1">
        <Icon name="ti:users" size="14" />
        {{ offer.maxPassengers }} plazas
      </span>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <span v-if="offer.discountPct > 0" class="text-xs text-white/30 line-through mr-2">
          {{ formattedBasePrice }}
        </span>
        <span class="text-lg font-semibold text-brand-gold">{{ formattedFinalPrice }}</span>
      </div>
      <OfferTimer v-if="showTimer" :until="offer.availableUntil" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  offer: any
  showTimer?: boolean
}>(), {
  showTimer: true,
})

const timeWindow = computed(() => {
  const from = new Date(props.offer.availableFrom || props.offer.available_from)
  const until = new Date(props.offer.availableUntil || props.offer.available_until)
  const fmt = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return `${fmt(from)} – ${fmt(until)}`
})

const formattedBasePrice = computed(() => {
  const price = props.offer.basePrice || props.offer.base_price
  return `${Number(price).toFixed(2)} €`
})

const formattedFinalPrice = computed(() => {
  const price = props.offer.finalPrice || props.offer.final_price
  return `${Number(price).toFixed(2)} €`
})
</script>
