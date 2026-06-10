import { Resend } from 'resend'

let resend: Resend | null = null

function useResend() {
  if (!resend) {
    const config = useRuntimeConfig()
    resend = new Resend(config.resendApiKey)
  }
  return resend
}

export async function sendEmail(to: string, subject: string, html: string) {
  const config = useRuntimeConfig()
  const r = useResend()
  await r.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@clubtaxisasturias.es',
    to,
    subject,
    html,
  })
}

export async function notifyDriver(driverId: string, booking: any) {
  // TODO: Implement push notification + email
}

export async function notifyClientConfirmed(bookingId: string) {
  // TODO: Implement email notification
}

export async function notifyAdminNoDrivers(bookingId: string) {
  // TODO: Implement admin notification
}
