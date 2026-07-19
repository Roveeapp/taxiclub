export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  srcDir: 'app/',
  serverDir: 'app/server',

  modules: [
    '@primevue/nuxt-module',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  primevue: {
    importTheme: { from: '@/themes/clubtaxis' },
  },

  icon: {
    serverBundle: {
      collections: ['tabler'],
    },
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Club Taxis Asturias',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'description', content: 'Tu taxi de confianza en Asturias' },
        { name: 'theme-color', content: '#0c0c13' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    emailFrom: process.env.EMAIL_FROM ?? '',
    vapidMailto: process.env.VAPID_MAILTO ?? '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
    nominatimUrl: process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? '',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.NUXT_PUBLIC_STRIPE_PK ?? '',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    },
  },

  supabase: {
    redirect: false,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name: 'Club Taxis Asturias',
      short_name: 'ClubTaxis',
      description: 'Tu taxi de confianza en Asturias',
      theme_color: '#0c0c13',
      background_color: '#0c0c13',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      lang: 'es',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    imports: {
      dirs: ['app/server/services'],
    },
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },

  typescript: {
    strict: true,
  },

  sourcemap: {
    server: false,
    client: false,
  },
})
