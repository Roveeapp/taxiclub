<template>
  <div class="flex items-center gap-2">
    <div class="relative">
      <div
        class="w-3 h-3 rounded-full"
        :class="dotClass"
      />
      <div
        v-if="status === 'pending' || status === 'searching'"
        class="absolute inset-0 w-3 h-3 rounded-full animate-ping"
        :class="dotClass"
      />
    </div>
    <span class="text-sm font-medium" :class="textClass">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  status: 'searching' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
}>()

const label = computed(() => {
  switch (props.status) {
    case 'searching': return 'Buscando taxista…'
    case 'pending': return 'Pendiente de confirmar'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return props.status
  }
})

const dotClass = computed(() => {
  switch (props.status) {
    case 'searching': return 'bg-info'
    case 'pending': return 'bg-warning'
    case 'confirmed': return 'bg-success'
    case 'completed': return 'bg-gray-400'
    case 'cancelled': return 'bg-error'
    default: return 'bg-gray-400'
  }
})

const textClass = computed(() => {
  switch (props.status) {
    case 'searching': return 'text-info'
    case 'pending': return 'text-warning'
    case 'confirmed': return 'text-success'
    case 'completed': return 'text-gray-500'
    case 'cancelled': return 'text-error'
    default: return 'text-gray-500'
  }
})
</script>
