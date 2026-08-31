import type { ZodError, ZodTypeAny, output } from 'zod'

/**
 * Lee y valida el cuerpo de una petición contra un esquema.
 *
 * Ninguna de las 30 rutas que leían un cuerpo validaba su forma: `passengers`
 * podía ser negativo o un texto, `pickupAt` cualquier cadena, `discountPct`
 * 500. Ese sustrato es el origen común de buena parte de los fallos de esta
 * auditoría, incluido el precio manipulable.
 *
 * Devuelve el dato ya tipado, así que además sustituye a bastantes `as any`.
 *
 * Se tipa con `S extends ZodTypeAny` y `output<S>` en lugar de `ZodType<T>`:
 * esa forma fuerza que la entrada y la salida del esquema sean el mismo tipo, y
 * cualquier esquema con `z.preprocess` o `.transform()` las tiene distintas, con
 * lo que la inferencia caía a `{}` y quien llamaba perdía los tipos.
 */
export async function readValidated<S extends ZodTypeAny>(
  event: Parameters<typeof readBody>[0],
  schema: S,
): Promise<output<S>> {
  const raw = await readBody(event).catch(() => null)
  const result = schema.safeParse(raw)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: describirError(result.error),
      data: { campos: camposConError(result.error) },
    })
  }
  return result.data
}

/** Valida query params con el mismo contrato de error. */
export async function readValidatedQuery<S extends ZodTypeAny>(
  event: Parameters<typeof getQuery>[0],
  schema: S,
): Promise<output<S>> {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: describirError(result.error),
      data: { campos: camposConError(result.error) },
    })
  }
  return result.data
}

/**
 * Mensaje legible para quien usa la app: nombra el campo y qué le pasa, en
 * lugar de volcar el error de la librería.
 */
function describirError(error: ZodError): string {
  const primero = error.issues[0]
  if (!primero) return 'Los datos enviados no son válidos'

  const campo = primero.path.join('.')
  return campo
    ? `El campo «${campo}» no es válido: ${primero.message}`
    : primero.message
}

function camposConError(error: ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of error.issues) {
    const campo = issue.path.join('.') || '_'
    if (!campos[campo]) campos[campo] = issue.message
  }
  return campos
}
