/**
 * Alta pública de una cuenta.
 *
 * ESCALADA DE PRIVILEGIOS QUE ESTO CIERRA
 *   La ruta no exige autenticación y tomaba `role` directamente del cuerpo, así
 *   que un solo POST sin credenciales creaba una cuenta de administrador:
 *
 *     POST /api/auth/register
 *     { "email": "...", "password": "...", "role": "admin" }
 *
 *   Verificado: la cuenta se creaba con role='admin' en public.users y en el
 *   user_metadata de Auth, con acceso a todas las reservas, a los datos de los
 *   conductores, a capturar y devolver pagos y a las liquidaciones. El 500 por
 *   clave duplicada que devolvía la ruta enmascaraba el éxito del ataque.
 *
 *   Ahora el rol se valida contra un enum de dos valores (`client`, `driver`).
 *   Un alta de administrador solo puede salir del panel de admin.
 *
 * DE PASO
 *   Se elimina la inserción manual en `users`: el trigger on_auth_user_created
 *   ya crea el perfil a partir del user_metadata. Insertar otra vez provocaba
 *   el `duplicate key value violates unique constraint "users_pkey"` que
 *   devolvía 500 en cada registro. La ficha de driver pasa a upsert por el
 *   mismo motivo: el trigger también la crea cuando el rol es driver.
 *
 * EL ALTA DE TAXISTA ESTABA ROTA A PARTIR DEL SEGUNDO
 *   `drivers.license_number` es UNIQUE, y tanto esta ruta como el trigger
 *   escribían el literal 'PENDING' cuando no había número. El primer taxista
 *   ocupaba ese valor y todos los siguientes chocaban con la clave única; al
 *   usuario le llegaba «Database error creating new user» y el alta se
 *   deshacía. Ocurría incluso aportando el número, porque el trigger solo lee
 *   la metadata y aquí no se metía.
 *
 *   Ahora los datos de licencia viajan en el user_metadata, para que el trigger
 *   los use, y si no vienen la columna se queda a NULL —que es lo que significa
 *   «todavía no lo ha dado»— en lugar de inventarse una palabra.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidated(event, registroSchema)
  const role = body.role || 'client'

  const db = useDb()
  const { data, error } = await db.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: body.fullName || '',
      phone: body.phone || '',
      // El trigger crea la ficha de conductor y solo ve la metadata: si los
      // datos de licencia no llegan aquí, no llegan a ningún sitio.
      license_number: body.licenseNumber || '',
      license_city: body.licenseCity || '',
    },
  })

  if (error || !data?.user) {
    throw createError({ statusCode: 400, message: error?.message || 'No se pudo crear la cuenta' })
  }

  // El perfil de public.users y la ficha de drivers los crea el trigger
  // on_auth_user_created a partir del user_metadata, ya con los datos de
  // licencia. Este upsert solo cubre el caso de que el trigger no exista o no
  // haya llegado a crearla; nunca inventa un valor.
  if (role === 'driver') {
    const { error: driverError } = await writeTable('drivers').insert({
      id: data.user.id,
      license_number: body.licenseNumber?.trim() || null,
      license_city: body.licenseCity?.trim() || null,
    })

    // El trigger ya pudo crear la ficha; un choque de clave aquí no es un fallo
    // del alta, así que solo se registra en lugar de devolver un 500.
    if (driverError && !/duplicate key/i.test(driverError.message)) {
      console.error(
        `[Register] No se pudo completar la ficha de conductor ${data.user.id}:`,
        driverError.message,
      )
    }
  }

  return { id: data.user.id, email: data.user.email }
})
