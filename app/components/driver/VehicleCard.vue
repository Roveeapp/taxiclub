<template>
  <div class="card-surface rounded-card overflow-hidden border border-outline-variant hover:border-secondary/40 transition-colors">
    <!-- Foto o placeholder -->
    <div class="relative h-36 bg-surface-container-high">
      <img
        v-if="photoUrl"
        :src="photoUrl"
        :alt="`${brand} ${model}`"
        class="w-full h-full object-cover"
        loading="lazy"
      >
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2 vehicle-placeholder">
        <Icon name="tabler:car" size="36" class="text-secondary/50" />
        <span class="text-[11px] text-on-surface-variant/60">Sin foto</span>
      </div>

      <span
        class="absolute top-3 right-3 text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
        :class="isActive ? 'bg-success/80 text-white' : 'bg-black/60 text-white/70'"
      >
        {{ isActive ? 'Activo' : 'Inactivo' }}
      </span>

      <!-- Matrícula estilo placa -->
      <div class="absolute bottom-3 left-3 flex items-center rounded-md overflow-hidden shadow-lg">
        <div class="bg-info w-2 self-stretch" />
        <span class="bg-white text-brand-dark font-bold text-sm tracking-[0.15em] px-2.5 py-1">
          {{ plate }}
        </span>
      </div>
    </div>

    <div class="p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <p class="text-[15px] font-semibold text-on-surface">{{ brand }} {{ model }}</p>
          <p class="text-xs text-on-surface-variant">
            <span v-if="year">{{ year }}</span>
            <span v-if="year && color"> · </span>
            <span v-if="color">{{ color }}</span>
          </p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 py-3 border-y border-outline-variant/60">
        <div class="flex items-center justify-center gap-1.5">
          <Icon name="tabler:users" size="15" class="text-secondary" />
          <span class="text-sm text-on-surface font-medium">{{ maxPassengers }}</span>
          <span class="text-[10px] text-on-surface-variant uppercase">plazas</span>
        </div>
        <div class="flex items-center justify-center gap-1.5">
          <Icon name="tabler:luggage" size="15" class="text-secondary" />
          <span class="text-sm text-on-surface font-medium">{{ maxLuggageBig }}</span>
          <span class="text-[10px] text-on-surface-variant uppercase">maletas</span>
        </div>
        <div class="flex items-center justify-center gap-1.5">
          <Icon name="tabler:briefcase" size="15" class="text-secondary" />
          <span class="text-sm text-on-surface font-medium">{{ maxLuggageHand }}</span>
          <span class="text-[10px] text-on-surface-variant uppercase">mano</span>
        </div>
      </div>

      <div v-if="extras.length > 0" class="flex flex-wrap gap-1.5 mt-3">
        <span
          v-for="extra in extras"
          :key="extra"
          class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full border border-secondary/20"
        >
          {{ extra }}
        </span>
      </div>

      <div class="flex gap-2 mt-4">
        <NuxtLink
          :to="`/taxista/vehiculos/${vehicle.id}`"
          class="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-dark bg-secondary py-2 rounded-btn active:scale-[0.97] transition-transform"
        >
          <Icon name="tabler:pencil" size="15" />
          Editar
        </NuxtLink>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 text-sm text-on-surface-variant border border-outline-variant hover:border-error hover:text-error py-2 rounded-btn transition-colors"
          @click="$emit('deactivate', vehicle.id)"
        >
          <Icon name="tabler:power" size="15" />
          Desactivar
        </button>
      </div>
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

// La API devuelve snake_case; algunos flujos antiguos pasaban camelCase.
// Estos getters aceptan ambos.
const v = computed(() => props.vehicle || {})
const plate = computed(() => v.value.plate || '')
const brand = computed(() => v.value.brand || '')
const model = computed(() => v.value.model || '')
const year = computed(() => v.value.year || '')
const color = computed(() => v.value.color || '')
const photoUrl = computed(() => v.value.photo_url ?? v.value.photoUrl ?? null)
const isActive = computed(() => v.value.is_active ?? v.value.isActive ?? true)
const maxPassengers = computed(() => v.value.max_passengers ?? v.value.maxPassengers ?? 0)
const maxLuggageBig = computed(() => v.value.max_luggage_big ?? v.value.maxLuggageBig ?? 0)
const maxLuggageHand = computed(() => v.value.max_luggage_hand ?? v.value.maxLuggageHand ?? 0)

const extras = computed(() => {
  const out: string[] = []
  const accessories = Array.isArray(v.value.accessories) ? v.value.accessories : []
  for (const a of accessories) {
    if (a?.name) out.push(a.name)
  }
  const flagMap: Array<[boolean, string]> = [
    [(v.value.has_child_seat ?? v.value.hasChildSeat) === true, 'Silla bebé'],
    [(v.value.has_pet_friendly ?? v.value.hasPetFriendly) === true, 'Mascotas'],
    [(v.value.is_accessible ?? v.value.isAccessible) === true, 'PMR'],
    [(v.value.is_large_vehicle ?? v.value.isLargeVehicle) === true, 'Grande'],
  ]
  for (const [flag, label] of flagMap) {
    if (flag && !out.some(name => name.toLowerCase().includes(label.slice(0, 4).toLowerCase()))) {
      out.push(label)
    }
  }
  return out
})
</script>

<style scoped>
.vehicle-placeholder {
  background:
    radial-gradient(circle at 30% 40%, rgba(250, 189, 50, 0.06) 0%, transparent 60%),
    repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255, 255, 255, 0.015) 12px, rgba(255, 255, 255, 0.015) 24px);
}
</style>
