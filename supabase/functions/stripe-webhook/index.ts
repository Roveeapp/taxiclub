import Stripe from 'npm:stripe@^14.0.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  // We only care about POST requests for the webhook
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string
    
    // Verificamos la firma usando Web Crypto API
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    console.log(`[Stripe Webhook] Received event: ${event.type} for id: ${event.data.object.id}`)

    // Create Supabase admin client to bypass RLS when updating the database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        console.log(`💰 PaymentIntent status: ${paymentIntent.status}`)
        // Lógica para actualizar la reserva en Supabase
        /*
        await supabaseClient
          .from('bookings')
          .update({ status: 'paid', payment_status: 'succeeded' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        */
        break
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        console.log(`❌ Payment failed: ${paymentIntent.last_payment_error?.message}`)
        break
      }
      case 'payment_intent.amount_capturable_updated': {
        const paymentIntent = event.data.object
        console.log(`Payment capturable: ${paymentIntent.id}`)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`)
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`, { status: 400 })
  }
})
