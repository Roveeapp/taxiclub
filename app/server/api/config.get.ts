import { getIntegration } from '../utils/integrations'

export default defineEventHandler(async () => {
  const config = await getSystemConfig()

  // La publishable key de Stripe es pública por diseño; las claves
  // secretas viven en integration_settings y NUNCA se exponen aquí.
  const stripePk = await getIntegration('stripe_publishable_key')

  return {
    ...config,
    stripe_publishable_key: stripePk || undefined,
  }
})
