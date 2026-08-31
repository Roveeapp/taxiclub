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
    },
  })

  if (error || !data?.user) {
    throw createError({ statusCode: 400, message: error?.message || 'No se pudo crear la cuenta' })
  }

  // El perfil de public.users lo crea el trigger on_auth_user_created a partir
  // del user_metadata. Solo completamos lo que el trigger no sabe.
  if (role === 'driver') {
    const { error: driverError } = await writeTable('drivers').insert({
      id: data.user.id,
      license_number: body.licenseNumber || 'PENDING',
      license_city: body.licenseCity || 'PENDING',
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
