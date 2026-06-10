<template>
  <div class="bg-white rounded-card p-6">
    <h3 class="text-lg font-medium text-text-on-light mb-4">Resumen de ingresos</h3>

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="p-3 bg-surface-input rounded-input">
        <p class="text-xs text-text-muted-light mb-1">Bruto</p>
        <p class="text-xl font-semibold text-text-on-light">{{ formatCurrency(gross) }}</p>
      </div>
      <div class="p-3 bg-surface-input rounded-input">
        <p class="text-xs text-text-muted-light mb-1">Comisión ({{ commissionPct }}%)</p>
        <p class="text-xl font-semibold text-error">-{{ formatCurrency(commissionAmt) }}</p>
      </div>
      <div class="p-3 bg-surface-input rounded-input">
        <p class="text-xs text-text-muted-light mb-1">Cuota club</p>
        <p class="text-xl font-semibold text-error">-{{ formatCurrency(membershipFee) }}</p>
      </div>
      <div class="p-3 bg-success/10 rounded-input border border-success/20">
        <p class="text-xs text-success mb-1">Neto</p>
        <p class="text-xl font-semibold text-success">{{ formatCurrency(finalPayout) }}</p>
      </div>
    </div>

    <div class="pt-4 border-t border-surface-divider">
      <div class="flex items-center justify-between text-sm">
        <span class="text-text-muted-light">Viajes completados</span>
        <span class="font-medium text-text-on-light">{{ tripsCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  gross?: number
  commissionPct?: number
  commissionAmt?: number
  membershipFee?: number
  finalPayout?: number
  tripsCount?: number
}>(), {
  gross: 0,
  commissionPct: 10,
  commissionAmt: 0,
  membershipFee: 0,
  finalPayout: 0,
  tripsCount: 0,
})

function formatCurrency(amount: number) {
  return `${amount.toFixed(2)} €`
}
</script>
