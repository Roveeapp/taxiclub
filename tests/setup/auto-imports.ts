/**
 * Da a los tests los mismos globales que Nuxt auto-importa.
 *
 * Ningún composable del proyecto importa de `vue`: todos usan los
 * auto-imports, que es la convención del código. Eso los hacía imposibles de
 * probar en vitest, donde `ref` no existe — y por eso la carpeta
 * `app/composables/` no tenía un solo test.
 *
 * La alternativa era añadir imports explícitos solo en los ficheros que se
 * quisiera probar, y eso deja el proyecto con dos estilos y hace que «tener
 * test» dependa de recordar el import. Es mejor que el entorno de pruebas se
 * parezca al de producción.
 */
import {
  ref, shallowRef, computed, reactive, readonly, toRef, toRefs,
  watch, watchEffect, nextTick, effectScope, onScopeDispose,
  onMounted, onUnmounted, unref, isRef,
} from 'vue'

const globales = {
  ref, shallowRef, computed, reactive, readonly, toRef, toRefs,
  watch, watchEffect, nextTick, effectScope, onScopeDispose,
  unref, isRef,
  // Los hooks de ciclo de vida solo funcionan dentro de un componente. Fuera,
  // Vue avisa por consola; en un test de composable no hay componente, así que
  // se dejan como no-op para que el aviso no ensucie la salida.
  onMounted: (fn: () => void) => fn,
  onUnmounted: () => {},
}

for (const [nombre, valor] of Object.entries(globales)) {
  if (!(nombre in globalThis)) {
    ;(globalThis as Record<string, unknown>)[nombre] = valor
  }
}

export { onMounted, onUnmounted }
