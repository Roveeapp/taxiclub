import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function useStripe() {
  if (!stripeInstance) {
    const config = useRuntimeConfig()
    stripeInstance = new Stripe(config.stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    })
  }
  return stripeInstance
}
