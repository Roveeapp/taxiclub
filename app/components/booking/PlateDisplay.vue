<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="icon-wrap-subtle">
        <Icon name="tabler:steering-wheel" size="20" class="text-brand-gold" />
      </div>
      <div>
        <p class="text-lg font-semibold text-white tracking-wide">{{ plate }}</p>
        <p v-if="substitute" class="text-xs text-white/45">
          Sustituto: {{ substitutePlate }}
        </p>
      </div>
    </div>
    <a
      v-if="phone"
      :href="`tel:${phone}`"
      class="flex items-center gap-2 bg-brand-gold text-brand-dark px-4 py-2 rounded-btn text-sm font-medium hover:bg-gold-600 transition-colors"
      aria-label="Llamar al conductor"
    >
      <Icon name="tabler:phone-call" size="16" />
      Llamar
    </a>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  plate: string
  phone?: string
  substitute?: boolean
  substitutePlate?: string
}>()
</script>
