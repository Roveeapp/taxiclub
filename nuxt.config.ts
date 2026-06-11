export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  css: ['~/app/assets/css/main.css'],

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
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  runtimeConfig: {
    supabaseServiceRoleKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    resendApiKey: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    nominatimUrl: '',
    vapidPrivateKey: '',
    public: {
      appUrl: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      stripePublishableKey: '',
      vapidPublicKey: '',
    },
  },

  supabase: {
    redirect: false,
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
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '*/5 * * * *':  ['expire-offers'],
      '*/15 * * * *': ['remind-unconfirmed'],
      '0 8 1 * *':    ['process-payouts'],
      '0 9 1 * *':    ['charge-memberships'],
    },
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },

  typescript: {
    strict: true,
  },
})
