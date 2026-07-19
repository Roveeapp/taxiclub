/**
 * Error tracking ligero sin dependencias: envía errores no capturados
 * del navegador a /api/log-error. Con límite para no inundar el servidor.
 */
export default defineNuxtPlugin((nuxtApp) => {
  let sent = 0
  const MAX_PER_SESSION = 10

  function report(message: string, stack?: string) {
    if (sent >= MAX_PER_SESSION) return
    sent++
    $fetch('/api/log-error', {
      method: 'POST',
      body: { message, stack, url: window.location.href },
    }).catch(() => { /* nunca romper por el reporter */ })
  }

  nuxtApp.vueApp.config.errorHandler = (error: any, _instance, info) => {
    console.error('[VueError]', error, info)
    report(error?.message || String(error), error?.stack)
  }

  window.addEventListener('error', (e) => {
    report(e.message, e.error?.stack)
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason
    report(reason?.message || String(reason), reason?.stack)
  })
})
