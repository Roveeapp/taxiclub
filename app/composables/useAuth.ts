import { storeToRefs } from 'pinia'

export function useAuth() {
  const authStore = useAuthStore()
  const { user, role, isClient, isDriver, isAdmin } = storeToRefs(authStore)

  return {
    user,
    role,
    isClient,
    isDriver,
    isAdmin,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signOut: authStore.signOut,
  }
}
