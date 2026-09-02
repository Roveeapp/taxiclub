<template>
  <Button
    :class="[
      fullWidth ? 'w-full' : '',
      // `primary` y `gold` son lo mismo: el CTA dorado de la marca. `primary`
      // no ponía NINGUNA clase, así que caía al estilo propio de PrimeVue —oro
      // brillante con etiqueta blanca, 1,69 de contraste—, y son 30 de los 35
      // usos de este botón, incluido el «Reservar» del cliente.
      //
      // Con los tokens sale bien en los dos temas: en oscuro, #412d00 sobre
      // #fabd32 (7,74); en el panel claro, blanco sobre #8a6100 (5,54). Y sigue
      // al tema, que el estilo de PrimeVue no hace: su preset lleva
      // `darkModeSelector: false`.
      variant === 'primary' || variant === 'gold'
        ? '!bg-secondary !text-on-secondary !border-secondary'
        : '',
      variant === 'secondary' ? '!bg-surface-container-high !text-on-surface !border-outline-variant' : '',
    ]"
    :disabled="disabled || loading"
    :loading="loading"
    :pt="buttonPt"
    @click="$emit('click', $event)"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'gold'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
}>(), {
  variant: 'primary',
  // Por defecto el botón se ajusta al contenido; usa full-width en CTAs móviles
  fullWidth: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonPt = {
  root: { class: '!rounded-xl !py-3 !font-bold !text-sm' },
}
</script>
