/**
 * Endpoint mínimo de error tracking: recibe errores del cliente y los
 * registra en el log del servidor (visibles en Vercel/hosting).
 * Para tracking completo con alertas: `npm i @sentry/nuxt` y seguir
 * https://docs.sentry.io/platforms/javascript/guides/nuxt/
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  if (!body?.message) return { ok: false }

  console.error('[ClientError]', JSON.stringify({
    message: String(body.message).slice(0, 500),
    stack: String(body.stack || '').slice(0, 2000),
    url: String(body.url || '').slice(0, 300),
    userAgent: getHeader(event, 'user-agent')?.slice(0, 200),
    at: new Date().toISOString(),
  }))

  return { ok: true }
})
