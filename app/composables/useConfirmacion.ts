/**
 * Confirmación como promesa, para poder sustituir `confirm()` en una línea.
 *
 * Se llama useConfirmacion y no useConfirm porque PrimeVue ya expone un
 * useConfirm() auto-importado —su servicio ConfirmDialog— que tapaba a este.
 *
 * Antes:  if (!confirm('¿Cancelar esta reserva?')) return
 * Ahora:  if (!await confirmar({ titulo: '…', mensaje: '…' })) return
 *
 * El diálogo se monta una sola vez en el layout; aquí solo vive el estado y la
 * promesa que se resuelve al responder.
 */
export interface OpcionesConfirmacion {
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  /** Pinta la acción como destructiva. */
  destructivo?: boolean
  /**
   * Si se indica, hay que escribirla para poder confirmar. Para acciones con
   * consecuencias económicas, donde un botón se acepta por inercia.
   */
  palabraClave?: string | null
}

interface EstadoDialogo extends OpcionesConfirmacion {
  abierto: boolean
}

const ESTADO_INICIAL: EstadoDialogo = {
  abierto: false,
  titulo: '',
  mensaje: '',
  textoConfirmar: 'Confirmar',
  textoCancelar: 'Cancelar',
  destructivo: false,
  palabraClave: null,
}

// La promesa pendiente vive fuera del estado reactivo: no es serializable y
// solo existe en el cliente, que es donde hay alguien a quien preguntar.
let pendiente: ((respuesta: boolean) => void) | null = null

export function useConfirmacion() {
  const estado = useState<EstadoDialogo>('confirmDialog', () => ({ ...ESTADO_INICIAL }))

  function confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    // En servidor no hay a quién preguntar: no se asume un sí.
    if (import.meta.server) return Promise.resolve(false)

    // Si ya había una pendiente, se resuelve como cancelada para no dejarla
    // colgada esperando para siempre.
    pendiente?.(false)

    estado.value = { ...ESTADO_INICIAL, ...opciones, abierto: true }
    return new Promise<boolean>((resolve) => {
      pendiente = resolve
    })
  }

  function responder(respuesta: boolean) {
    estado.value = { ...estado.value, abierto: false }
    const resolver = pendiente
    pendiente = null
    resolver?.(respuesta)
  }

  return { estado, confirmar, responder }
}
