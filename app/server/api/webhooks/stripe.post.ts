export default defineEventHandler(async (event) => {
  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')
  const config = useRuntimeConfig()

  const stripe = useStripe()
  const stripeEvent = stripe.webhooks.constructEvent(
    body!,
    sig!,
    config.stripeWebhookSecret,
  )

  switch (stripeEvent.type) {
    case 'payment_intent.amount_capturable_updated':
      console.log('Payment capturable:', stripeEvent.data.object.id)
      break
    case 'payment_intent.payment_failed':
      console.log('Payment failed:', stripeEvent.data.object.id)
      break
    default:
      console.log('Unhandled event type:', stripeEvent.type)
  }

  return { received: true }
})
