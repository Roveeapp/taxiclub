<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-on-surface">Configuración</h1>
      <p class="text-sm text-on-surface-variant mt-1">
        Integraciones de la plataforma. Las comisiones y tarifas se gestionan en
        <NuxtLink to="/admin/comisiones" class="text-brand-gold hover:text-gold-600">Comisiones</NuxtLink>.
      </p>
    </div>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else class="space-y-6 max-w-2xl">
      <!-- Stripe -->
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-medium text-on-surface flex items-center gap-2">
            <Icon name="tabler:brand-stripe" size="18" class="text-brand-gold" />
            Stripe (pagos)
          </h2>
          <span class="text-xs px-2.5 py-1 rounded-full" :class="statusClass('stripe_secret_key')">
            {{ statusLabel('stripe_secret_key') }}
          </span>
        </div>
        <p class="text-xs text-on-surface-variant mb-4">
          Claves de tu cuenta de Stripe (modo test: sk_test_… / pk_test_…). Los campos secretos muestran el valor enmascarado; escribe uno nuevo para reemplazarlo.
        </p>
        <div class="space-y-4">
          <IntegrationField v-model="form.stripe_secret_key" label="Secret key (sk_...)" :current="current.stripe_secret_key" secret />
          <IntegrationField v-model="form.stripe_publishable_key" label="Publishable key (pk_...)" :current="current.stripe_publishable_key" />
          <IntegrationField v-model="form.stripe_webhook_secret" label="Webhook signing secret (whsec_...)" :current="current.stripe_webhook_secret" secret />
        </div>
      </div>

      <!-- Email -->
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-medium text-on-surface flex items-center gap-2">
            <Icon name="tabler:mail" size="18" class="text-brand-gold" />
            Email (Resend)
          </h2>
          <span class="text-xs px-2.5 py-1 rounded-full" :class="statusClass('resend_api_key')">
            {{ statusLabel('resend_api_key') }}
          </span>
        </div>
        <p class="text-xs text-on-surface-variant mb-4">Para confirmaciones de reserva, recordatorios y avisos.</p>
        <div class="space-y-4">
          <IntegrationField v-model="form.resend_api_key" label="API key (re_...)" :current="current.resend_api_key" secret />
          <IntegrationField v-model="form.email_from" label="Remitente" :current="current.email_from" placeholder="Club Taxis <noreply@tudominio.es>" />
        </div>
      </div>

      <!-- SMS -->
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-medium text-on-surface flex items-center gap-2">
            <Icon name="tabler:message" size="18" class="text-brand-gold" />
            SMS (Twilio)
          </h2>
          <span class="text-xs px-2.5 py-1 rounded-full" :class="statusClass('twilio_account_sid')">
            {{ statusLabel('twilio_account_sid') }}
          </span>
        </div>
        <p class="text-xs text-on-surface-variant mb-4">Opcional. Si no se configura, los SMS solo se registran en el log.</p>
        <div class="space-y-4">
          <IntegrationField v-model="form.twilio_account_sid" label="Account SID (AC...)" :current="current.twilio_account_sid" />
          <IntegrationField v-model="form.twilio_auth_token" label="Auth token" :current="current.twilio_auth_token" secret />
          <IntegrationField v-model="form.twilio_phone_number" label="Número emisor" :current="current.twilio_phone_number" placeholder="+34..." />
        </div>
      </div>

      <div class="flex items-center gap-3">
        <AppButton :loading="saving" @click="handleSave">
          <Icon name="tabler:device-floppy" size="16" class="mr-1.5" />
          Guardar integraciones
        </AppButton>
        <Transition name="fade">
          <span v-if="saved" class="flex items-center gap-1.5 text-sm text-success">
            <Icon name="tabler:circle-check" size="16" />
            Guardado
          </span>
          <span v-else-if="saveError" class="flex items-center gap-1.5 text-sm text-error">
            <Icon name="tabler:alert-circle" size="16" />
            {{ saveError }}
          </span>
        </Transition>
      </div>

      <p class="text-[11px] text-on-surface-variant">
        Los valores del panel tienen prioridad sobre el archivo .env y se guardan en una tabla
        solo accesible por el servidor. El webhook de Stripe (edge function) usa sus propios
        secretos de Supabase: <code class="text-brand-gold">supabase secrets set</code>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface FieldInfo { value: string, source: 'panel' | 'env' | 'none', isSecret: boolean }

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const current = reactive<Record<string, FieldInfo>>({})
/**
 * Las ocho claves de integración, declaradas de forma explícita en lugar de
 * como Record<string, string>: el acceso indexado en un Record da
 * `string | undefined`, y el v-model de IntegrationField espera `string`.
 * Enumerarlas también documenta cuáles son y evita erratas al escribirlas.
 */
const form = reactive({
  stripe_secret_key: '',
  stripe_publishable_key: '',
  stripe_webhook_secret: '',
  resend_api_key: '',
  email_from: '',
  twilio_account_sid: '',
  twilio_auth_token: '',
  twilio_phone_number: '',
})

/** Claves válidas del formulario, derivadas de su propia forma. */
type ClaveIntegracion = keyof typeof form

/**
 * La API puede devolver claves que el formulario no muestra (por ejemplo una
 * integración nueva antes de añadirle su campo). Este guardián evita indexar
 * el formulario con una clave que no tiene.
 */
function esClaveDelFormulario(key: string): key is ClaveIntegracion {
  return key in form
}

function statusLabel(key: string) {
  switch (current[key]?.source) {
    case 'panel': return 'Configurada (panel)'
    case 'env': return 'Configurada (.env)'
    default: return 'Sin configurar'
  }
}

function statusClass(key: string) {
  switch (current[key]?.source) {
    case 'panel': return 'bg-success/15 text-success'
    case 'env': return 'bg-info/15 text-info'
    default: return 'bg-warning/15 text-warning'
  }
}

async function load() {
  loading.value = true
  try {
    const data: any = await $fetch('/api/admin/integraciones')
    for (const [key, raw] of Object.entries(data)) {
      const info = raw as FieldInfo
      current[key] = info
      // Los no-secretos se precargan editables; los secretos se dejan vacíos
      if (!info.isSecret && info.source === 'panel' && esClaveDelFormulario(key)) {
        form[key] = info.value
      }
    }
  } catch (e) {
    console.error('Error loading integrations:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function handleSave() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const body: Record<string, string> = {}
    for (const [key, value] of Object.entries(form)) {
      if (value && value.trim()) body[key] = value.trim()
    }
    await $fetch('/api/admin/integraciones', { method: 'PATCH', body })
    // Limpiar secretos del formulario y recargar estados
    for (const key of Object.keys(form) as ClaveIntegracion[]) form[key] = ''
    await load()
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e?.data?.message || 'No se pudo guardar'
    setTimeout(() => { saveError.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
