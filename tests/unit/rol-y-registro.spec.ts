import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { registroSchema } from '../../app/server/utils/schemas'
import { descuentoOfertaValido } from '../../app/server/services/pricing'

const RAIZ = join(__dirname, '../..')
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

/**
 * El rol de un usuario no lo puede decidir el usuario.
 *
 * Hubo dos agujeros y el primero lo cerré en el sitio equivocado. Endurecí el
 * enum de `/api/auth/register`, pero NADA llama a esa ruta: el alta real la
 * hace el navegador con `supabase.auth.signUp({ options: { data: { role } } })`
 * desde `pages/cuenta/login.vue`, y el rol acababa en `public.users.role` a
 * través del trigger. Estas comprobaciones existen para que ese error no se
 * repita: fijan que la ruta siga cerrada Y que el middleware no vuelva a
 * fiarse de la metadata.
 */
describe('el rol no se autoasigna', () => {
  it('el esquema de registro solo admite client y driver', () => {
    expect(registroSchema.safeParse({
      email: 'a@b.com', password: 'secreta1', role: 'admin',
    }).success).toBe(false)

    for (const role of ['client', 'driver'] as const) {
      expect(registroSchema.safeParse({ email: 'a@b.com', password: 'secreta1', role }).success, role).toBe(true)
    }
  })

  it('el middleware no toca user_metadata para resolver el rol', () => {
    // La metadata la escribe el propio usuario: `updateUser({ data: { role } })`
    // está permitido sobre la cuenta propia, así que usarla para autorizar es
    // dejar que el cliente se asigne permisos. Comprobado contra el servidor:
    // con el código anterior, metadata=admin y tabla=client daba 200 en
    // /api/admin/paradas — y un admin de verdad daba 403.
    //
    // La primera versión de este test buscaba `event.context.role = ...
    // user_metadata` en la misma línea, y PASABA con el código roto: allí la
    // lectura y la asignación estaban en líneas distintas, y el `from('users')`
    // que el test exigía existía en una rama que casi nunca se ejecutaba. Un
    // test que no distingue el antes del después no comprueba nada.
    //
    // El criterio que sí distingue es el más simple: el middleware no tiene
    // ningún motivo para leer la metadata, así que no debe mencionarla fuera de
    // los comentarios.
    const mw = leer('app/server/middleware/auth.ts')
    const codigo = mw
      .split('\n')
      .filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l))
      .join('\n')

    expect(codigo, 'el rol no puede salir de user_metadata').not.toContain('user_metadata')
    // Y sale de la tabla, que solo se escribe con la clave de servicio
    expect(codigo).toMatch(/from\(\s*'users'\s*\)/)
    expect(codigo).toMatch(/select\(\s*'role'\s*\)/)
  })

  it('el trigger de alta acota el rol a los autoasignables', () => {
    const sql = leer('supabase/migrations/20260902081530_trigger_clamps_self_assigned_role.sql')
    expect(sql).toContain("rol_pedido IN ('client', 'driver')")
    // Y el valor por defecto cuando no lo es
    expect(sql).toMatch(/ELSE\s+'client'\s+END/)
  })
})

/**
 * `drivers.license_number` es UNIQUE, y el trigger insertaba el literal
 * 'PENDING' cuando el alta no traía número. Eso solo podía funcionar UNA vez en
 * toda la vida de la base de datos: el segundo taxista que se registrara
 * chocaba con la clave única y recibía «Database error creating new user».
 */
describe('el alta de taxista no se pisa a sí misma', () => {
  it('nadie escribe ya el literal PENDING como número de licencia', () => {
    const ruta = leer('app/server/api/auth/register.post.ts')
    // El literal puede aparecer en el comentario que explica el fallo, pero no
    // como valor asignado a la columna
    expect(ruta).not.toMatch(/license_number:\s*[^\n]*'PENDING'/)
    expect(ruta).not.toMatch(/license_city:\s*[^\n]*'PENDING'/)
  })

  it('los datos de licencia viajan en la metadata, que es lo único que ve el trigger', () => {
    const ruta = leer('app/server/api/auth/register.post.ts')
    const metadata = ruta.slice(ruta.indexOf('user_metadata'), ruta.indexOf('email_confirm') + 400)
    expect(metadata).toContain('license_number')
    expect(metadata).toContain('license_city')
  })

  it('el trigger deja NULL cuando el alta no trae licencia', () => {
    const sql = leer('supabase/migrations/20260902081530_trigger_clamps_self_assigned_role.sql')
    expect(sql).toContain("NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'license_number', '')), '')")
  })

  it('la migración quita el NOT NULL y limpia los PENDING que hubiera', () => {
    const sql = leer('supabase/migrations/20260902081211_driver_license_nullable_until_provided.sql')
    expect(sql).toMatch(/ALTER COLUMN license_number DROP NOT NULL/)
    expect(sql).toMatch(/UPDATE public\.drivers SET license_number = NULL WHERE license_number = 'PENDING'/)
  })

  it('el esquema acepta el teléfono, que el trigger ya leía y nadie enviaba', () => {
    const r = registroSchema.safeParse({
      email: 'a@b.com', password: 'secreta1', role: 'driver', phone: '+34600123456',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.phone).toBe('+34600123456')
  })
})

/**
 * El tope de descuento de una oferta de retorno existía en tres sitios y
 * ninguno era el que hacía falta: el deslizador del formulario lo limitaba a
 * 40, la ruta de EDICIÓN lo comprobaba con un 40 escrito a mano, y
 * `system_config.max_return_offer_discount_pct` lo guardaba sin que nadie lo
 * leyera. La ruta de CREACIÓN no lo comprobaba en absoluto.
 *
 * Comprobado contra el servidor con el código anterior: un POST con
 * `discountPct: 100` devolvía 200 y `final_price = 0`. Y como la comisión del
 * club se calcula sobre el importe del viaje, un viaje de 0 € no devenga
 * comisión.
 */
describe('tope de descuento de las ofertas de retorno', () => {
  it('acepta el rango y rechaza pasarse', () => {
    expect(descuentoOfertaValido(0, 40)).toBe(true)
    expect(descuentoOfertaValido(40, 40)).toBe(true)
    expect(descuentoOfertaValido(41, 40)).toBe(false)
    expect(descuentoOfertaValido(100, 40)).toBe(false)
    expect(descuentoOfertaValido(-1, 40)).toBe(false)
  })

  it('sigue al tope de configuración, no a un 40 escrito a mano', () => {
    expect(descuentoOfertaValido(50, 60)).toBe(true)
    expect(descuentoOfertaValido(50, 25)).toBe(false)
  })

  it('exige entero, porque discount_pct es una columna integer', () => {
    // Antes un 40,5 llegaba a Postgres y devolvía un 500 con
    // «invalid input syntax for type integer: "40.5"»
    expect(descuentoOfertaValido(40.5, 40)).toBe(false)
    expect(descuentoOfertaValido(0.5, 40)).toBe(false)
    expect(descuentoOfertaValido(Number.NaN, 40)).toBe(false)
    expect(descuentoOfertaValido(Number.POSITIVE_INFINITY, 40)).toBe(false)
  })

  it('las dos rutas de oferta comprueban el mismo tope', () => {
    for (const ruta of [
      'app/server/api/taxista/ofertas/index.post.ts',
      'app/server/api/taxista/ofertas/[id].patch.ts',
    ]) {
      expect(leer(ruta), ruta).toContain('assertDescuentoOfertaPermitido')
    }
  })
})
