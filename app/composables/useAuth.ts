export function useAuth() {
  const authStore = useAuthStore()

  return {
    user: authStore.user,
    role: authStore.role,
    isClient: authStore.isClient,
    isDriver: authStore.isDriver,
    isAdmin: authStore.isAdmin,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signOut: authStore.signOut,
  }
}
