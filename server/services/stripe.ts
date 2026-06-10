import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function useStripe() {
  if (!stripeInstance) {
    const config = useRuntimeConfig()
    stripeInstance = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
  }
  return stripeInstance
}
