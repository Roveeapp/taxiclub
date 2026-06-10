import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const role = computed(() => user.value?.user_metadata?.role as string | undefined)
  const isClient = computed(() => role.value === 'client')
  const isDriver = computed(() => role.value === 'driver')
  const isAdmin = computed(() => role.value === 'admin')

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string, role: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
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
