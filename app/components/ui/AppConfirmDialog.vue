<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      :aria-describedby="idMensaje"
      @keydown.esc="cancelar"
    >
      <div class="absolute inset-0 bg-black/60" @click="cancelar" />

      <div
        ref="panel"
        class="relative w-full sm:max-w-md bg-surface-container rounded-t-card sm:rounded-card border border-white/10 p-lg pb-safe sm:pb-lg shadow-lg"
      >
        <h2 :id="idTitulo" class="font-headline-md text-headline-md text-on-surface mb-2">
          {{ titulo }}
        </h2>
        <p :id="idMensaje" class="font-body-md text-body-md text-on-surface-variant mb-lg">
          {{ mensaje }}
        </p>

        <!--
          Para las acciones con dinero de por medio no basta un botón: se pide
          escribir una palabra. «Procesar liquidaciones de todos los
          conductores» se aceptaba con Enter por inercia.
        -->
        <div v-if="palabraClave" class="mb-lg">
          <label :for="idInput" class="field-label block mb-2 text-on-surface-variant">
            Escribe <span class="text-secondary font-medium">{{ palabraClave }}</span> para confirmar
          </label>
          <input
            :id="idInput"
            ref="input"
            v-model="escrito"
            type="text"
            autocomplete="off"
            class="w-full bg-surface-container-high rounded-input px-4 py-3 text-on-surface border border-white/10 focus:border-secondary outline-none"
            @keydown.enter.prevent="puedeConfirmar && confirmar()"
          >
        </div>

        <div class="flex gap-3">
          <button
            ref="botonCancelar"
            type="button"
            class="flex-1 rounded-btn py-3 font-label-caps text-label-caps bg-surface-container-high text-on-surface active:scale-95 transition-transform"
            @click="cancelar"
          >
            {{ textoCancelar }}
          </button>
          <button
            type="button"
            :disabled="!puedeConfirmar"
            class="flex-1 rounded-btn py-3 font-label-caps text-label-caps text-brand-dark active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            :class="destructivo ? 'bg-error text-white' : 'bg-brand-gold'"
            @click="confirmar"
          >
            {{ textoConfirmar }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Diálogo de confirmación propio, para sustituir a `confirm()` del navegador.
 *
 * El nativo no se puede diseñar, ignora la marca y en iOS con la PWA instalada
 * se presenta de forma inconsistente: rompe la ilusión de aplicación justo en
 * los momentos que más confianza requieren (cancelar una reserva, dar de baja a
 * un conductor, procesar las liquidaciones del mes).
 *
 * Accesible por defecto, que era otro de los problemas del nativo dentro de una
 * app: rol de diálogo, foco atrapado dentro mientras está abierto, Escape para
 * cerrar y el foco devuelto a donde estaba al cerrarse.
 */
const props = withDefaults(defineProps<{
  abierto: boolean
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  /** Pinta el botón de confirmar como acción destructiva. */
  destructivo?: boolean
  /** Si se indica, hay que escribirla para poder confirmar. */
  palabraClave?: string | null
}>(), {
  textoConfirmar: 'Confirmar',
  textoCancelar: 'Cancelar',
  destructivo: false,
  palabraClave: null,
})

const emit = defineEmits<{ confirmar: [], cancelar: [] }>()

const escrito = ref('')
const panel = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const botonCancelar = ref<HTMLButtonElement | null>(null)

const uid = Math.random().toString(36).slice(2, 8)
const idTitulo = `confirm-titulo-${uid}`
const idMensaje = `confirm-mensaje-${uid}`
const idInput = `confirm-input-${uid}`

const puedeConfirmar = computed(() =>
  !props.palabraClave || escrito.value.trim() === props.palabraClave,
)

let devolverFocoA: HTMLElement | null = null

/** Mantiene el foco dentro del diálogo mientras está abierto. */
function atraparFoco(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !panel.value) return
  const focusables = panel.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])',
  )
  if (focusables.length === 0) return
  const primero = focusables[0]!
  const ultimo = focusables[focusables.length - 1]!

  if (e.shiftKey && document.activeElement === primero) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault()
    primero.focus()
  }
}

watch(() => props.abierto, async (estaAbierto) => {
  if (estaAbierto) {
    devolverFocoA = document.activeElement as HTMLElement | null
    escrito.value = ''
    document.addEventListener('keydown', atraparFoco)
    // El scroll del fondo se bloquea: en móvil, un diálogo sobre una página que
    // se sigue moviendo detrás se siente roto.
    document.body.style.overflow = 'hidden'
    await nextTick()
    // Con palabra clave el foco va al campo; sin ella, a Cancelar, para que
    // pulsar Enter sin leer no ejecute la acción destructiva.
    ;(props.palabraClave ? input.value : botonCancelar.value)?.focus()
  } else {
    document.removeEventListener('keydown', atraparFoco)
    document.body.style.overflow = ''
    devolverFocoA?.focus()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', atraparFoco)
  document.body.style.overflow = ''
})

function confirmar() {
  if (!puedeConfirmar.value) return
  emit('confirmar')
}

function cancelar() {
  emit('cancelar')
}
</script>
