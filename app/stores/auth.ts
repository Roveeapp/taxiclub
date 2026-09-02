import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // El rol lo dice el servidor, no el `user_metadata` que escribe el propio
  // usuario. Ver composables/useRol.ts.
  const { rol, asegurar: asegurarRol, olvidar: olvidarRol } = useRol()
  const role = computed(() => rol.value ?? undefined)
  const isClient = computed(() => role.value === 'client')
  const isDriver = computed(() => role.value === 'driver')
  const isAdmin = computed(() => role.value === 'admin')

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // El rol del anterior no vale para el nuevo
    olvidarRol()
    await asegurarRol()
  }

  async function signUp(email: string, password: string, role: string, fullName?: string, phone?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          role,
          full_name: fullName,
          phone: phone
        } 
      },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    olvidarRol()
  }

  return {
    user,
    role,
    isClient,
    isDriver,
    isAdmin,
    signIn,
    signUp,
    signOut,
  }
})
