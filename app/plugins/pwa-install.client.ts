export default defineNuxtPlugin(() => {
  let deferredPrompt: any = null

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e
  })

  return {
    provide: {
      installPWA: async () => {
        if (!deferredPrompt) return false
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        deferredPrompt = null
        return outcome === 'accepted'
      },
      canInstallPWA: () => !!deferredPrompt,
    },
  }
})
