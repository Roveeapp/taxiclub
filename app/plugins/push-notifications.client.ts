function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default defineNuxtPlugin(() => {
  const vapidPublicKey = useRuntimeConfig().public.vapidPublicKey

  if (!vapidPublicKey || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready.then(async (registration) => {
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    })

    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: { subscription: newSub.toJSON() },
    })
  })
})
