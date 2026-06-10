export default defineNuxtPlugin(() => {
  const vapidPublicKey = useRuntimeConfig().public.vapidPublicKey

  if (!vapidPublicKey || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready.then(async (registration) => {
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    })

    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: { subscription: newSub.toJSON() },
    })
  })
})
