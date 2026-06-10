export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  const protectedPaths = ['/taxista', '/admin', '/cuenta']
  const isProtected = protectedPaths.some(p => to.path.startsWith(p))

  if (!isProtected) return

  if (!user.value) {
    return navigateTo('/cuenta/login')
  }

  const role = user.value.user_metadata?.role

  if (to.path.startsWith('/taxista') && role !== 'driver' && role !== 'admin') {
    return navigateTo('/')
  }

  if (to.path.startsWith('/admin') && role !== 'admin') {
    return navigateTo('/')
  }
})
