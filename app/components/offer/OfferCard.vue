<template>
  <div class="glass-card rounded-xl p-md border border-white/10 relative active-scale">
    <div v-if="offer.discount_pct > 0 || offer.discountPct > 0" class="absolute top-md right-md bg-secondary/20 text-secondary px-sm py-base rounded-full">
      <span class="font-status-badge text-status-badge">-{{ offer.discount_pct || offer.discountPct }}% OFF</span>
    </div>
    <div class="flex gap-md items-center">
      <div class="w-16 h-16 rounded-lg bg-surface-container-highest flex items-center justify-center overflow-hidden">
        <Icon name="tabler:plane-arrival" size="28" class="text-secondary opacity-80" />
      </div>
      <div class="flex-1">
        <div class="flex items-center gap-xs mb-base">
          <Icon name="tabler:plane-arrival" size="14" class="text-on-surface-variant" />
          <span class="text-on-surface-variant font-label-caps text-[10px]">RETORNO AEROPUERTO</span>
        </div>
        <h4 class="font-title-sm text-title-sm text-on-surface">
          {{ offer.origin_address || offer.originAddress }} → {{ offer.destination_station_name || offer.destinationStationName }}
        </h4>
        <p class="text-on-surface-variant text-[12px] mt-base">
          {{ formatTime(offer.available_from || offer.availableFrom) }} · {{ offer.max_passengers || offer.maxPassengers }} plaza{{ (offer.max_passengers || offer.maxPassengers) !== 1 ? 's' : '' }} libre{{ (offer.max_passengers || offer.maxPassengers) !== 1 ? 's' : '' }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-on-surface-variant line-through text-[10px]">{{ formatPrice(offer.base_price || offer.basePrice) }}</p>
        <p class="font-price-display text-price-display text-secondary">{{ formatPrice(offer.final_price || offer.finalPrice) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  offer: any
}>()

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
    date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(price: any) {
  return `${Number(price || 0).toFixed(2).replace('.', ',')}€`
}
</script>
