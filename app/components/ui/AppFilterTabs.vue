<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="opcion in opciones"
      :key="opcion.value"
      type="button"
      class="px-3 py-1.5 rounded-lg text-sm border transition-colors"
      :class="opcion.value === modelValue
        ? 'bg-secondary/10 text-secondary border-secondary/40 font-medium'
        : 'bg-surface-container-high text-on-surface-variant border-transparent hover:bg-surface-container-highest'"
      :aria-pressed="opcion.value === modelValue"
      @click="$emit('update:modelValue', opcion.value)"
    >
      {{ opcion.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Los filtros de un listado del panel.
 *
 * POR QUÉ ES UN COMPONENTE
 *   Había cuatro copias —ofertas, reservas de admin, conductores y reservas de
 *   taxista— y ya habían divergido: tres pintaban el activo con
 *   `bg-secondary text-on-secondary` y la cuarta con `bg-brand-dark text-white`
 *   sobre `bg-gray-100`, grises crudos de Tailwind que no pasan por el sistema
 *   de tokens y por tanto no siguen al tema.
 *
 *   Es el mismo patrón que el buscador de origen y destino: cuatro copias del
 *   mismo widget, y las mejoras llegan a unas y no a otras.
 *
 * POR QUÉ EL ACTIVO ES UN TINTE Y NO UN RELLENO
 *   Con relleno sólido dorado, la pestaña activa pesaba lo mismo que el botón
 *   de acción principal —«Nuevo conductor», «Procesar liquidaciones»— y los dos
 *   competían: dos rectángulos dorados del mismo tamaño, uno que ejecuta algo y
 *   otro que solo dice qué estás mirando. El relleno sólido se reserva para la
 *   acción; el filtro seleccionado se marca con tinte, borde y el color del
 *   texto.
 *
 *   El tinte es del 10 % y no del 15 %: al 15 %, el oro del tema claro sobre
 *   blanco cae a 4,49 de contraste y se queda por debajo de AA. Al 10 % da 4,83
 *   en claro y 7,79 en oscuro.
 */
export interface OpcionFiltro {
  value: string
  label: string
}

defineProps<{
  opciones: OpcionFiltro[]
  modelValue: string
}>()

defineEmits<{ 'update:modelValue': [valor: string] }>()
</script>
