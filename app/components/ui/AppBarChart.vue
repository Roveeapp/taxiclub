<template>
  <div>
    <svg :viewBox="`0 0 ${width} ${height}`" class="w-full" role="img" :aria-label="ariaLabel">
      <g v-for="(item, i) in data" :key="item.date">
        <rect
          :x="i * slotW + gap / 2"
          :y="barY(item.count)"
          :width="slotW - gap"
          :height="barH(item.count)"
          rx="3"
          :fill="item.count > 0 ? 'rgb(var(--secondary))' : 'rgb(var(--outline))'"
          :fill-opacity="item.count > 0 ? (hovered === i ? 1 : 0.85) : 0.5"
          class="transition-all cursor-pointer"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        />
      </g>
      <!--
        El eje va en `--outline` y no en `--outline-variant`: este último es el
        hairline de las tarjetas (#ebebf0 en el tema claro), y sobre una tarjeta
        blanca da 1,19 de contraste — el eje desaparecía y con él la referencia
        de dónde apoyan las barras. `--outline` da 3,41 en claro y 5,17 en
        oscuro, que es el umbral de los elementos no textuales.

        Las barras de los días sin reservas van al 50 % del mismo token, para que
        se lean como un tic tenue en lugar de como nada: al 40 % de
        `--outline-variant` no se veían.
      -->
      <line :x1="0" :y1="height - baseline" :x2="width" :y2="height - baseline" stroke="rgb(var(--outline))" stroke-width="1" />
    </svg>
    <div class="flex justify-between text-[10px] text-on-surface-variant mt-1 px-0.5">
      <span>{{ formatDay(data[0]?.date) }}</span>
      <span v-if="puntoActivo" class="text-secondary font-medium">
        {{ formatDay(puntoActivo.date) }}: {{ puntoActivo.count }} reservas · {{ puntoActivo.revenue.toFixed(0) }} €
      </span>
      <span>{{ formatDay(data[data.length - 1]?.date) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  data: Array<{ date: string, count: number, revenue: number }>
  height?: number
  ariaLabel?: string
}>(), {
  height: 120,
  ariaLabel: 'Gráfica de reservas por día',
})

const width = 560
const gap = 6
const baseline = 1

const hovered = ref<number | null>(null)

/**
 * El punto sobre el que está el cursor. Como computada en lugar de indexar en
 * la plantilla: el `v-if` comprobaba `data[hovered]` pero TypeScript no
 * propagaba esa garantía a los hermanos, así que cada acceso daba
 * «Object is possibly undefined».
 */
const puntoActivo = computed(() => (hovered.value === null ? null : props.data[hovered.value] ?? null))

const slotW = computed(() => props.data.length > 0 ? width / props.data.length : width)
const maxCount = computed(() => Math.max(1, ...props.data.map(d => d.count)))

function barH(count: number) {
  const usable = props.height - baseline - 4
  return count > 0 ? Math.max(4, (count / maxCount.value) * usable) : 3
}

function barY(count: number) {
  return props.height - baseline - barH(count)
}

function formatDay(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
</script>
