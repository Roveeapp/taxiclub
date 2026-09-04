<template>
  <div class="pt-8">
    <div class="text-center mb-8">
      <div class="flex justify-center mb-4">
        <div class="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <Icon name="tabler:user" size="24" class="text-brand-gold" />
        </div>
      </div>
      <h1 class="text-[22px] font-medium text-white mb-1">
        {{ isLogin ? 'Iniciar sesión' : 'Crear cuenta' }}
      </h1>
      <p class="text-sm text-white/45">
        {{ isLogin ? 'Accede a tu cuenta de Club Taxis' : 'Regístrate para reservar tu taxi' }}
      </p>
    </div>

    <div class="bg-form-surface rounded-card p-6">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] font-medium text-on-form-muted uppercase tracking-[0.08em] block mb-1">Email</label>
          <div class="relative">
            <Icon name="tabler:mail" size="18" class="text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              autocomplete="email"
              class="login-input"
            >
          </div>
          <p v-if="errors.email" class="text-error text-xs mt-1">{{ errors.email }}</p>
        </div>

        <div>
          <label class="text-[11px] font-medium text-on-form-muted uppercase tracking-[0.08em] block mb-1">Contraseña</label>
          <div class="relative">
            <Icon name="tabler:lock" size="18" class="text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Mínimo 6 caracteres"
              :autocomplete="isLogin ? 'current-password' : 'new-password'"
              class="login-input !pr-11"
            >
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-on-form-muted hover:text-on-form-variant transition-colors"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'tabler:eye-off' : 'tabler:eye'" size="18" />
            </button>
          </div>
          <p v-if="errors.password" class="text-error text-xs mt-1">{{ errors.password }}</p>
        </div>

        <div v-if="!isLogin">
          <label class="text-[11px] font-medium text-on-form-muted uppercase tracking-[0.08em] block mb-1">Nombre completo</label>
          <div class="relative">
            <Icon name="tabler:user" size="18" class="text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="fullName"
              type="text"
              placeholder="Tu nombre y apellidos"
              autocomplete="name"
              class="login-input"
            >
          </div>
          <p v-if="errors.fullName" class="text-error text-xs mt-1">{{ errors.fullName }}</p>
        </div>

        <div v-if="!isLogin">
          <span class="field-label block mb-2">Tipo de cuenta</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="flex items-center justify-center gap-2 px-4 py-3 rounded-input border text-sm font-medium transition-all"
              :class="accountType === 'client'
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-form-border text-on-form-variant hover:border-brand-dark'"
              @click="accountType = 'client'"
            >
              <Icon name="tabler:user" size="16" />
              Cliente
            </button>
            <button
              class="flex items-center justify-center gap-2 px-4 py-3 rounded-input border text-sm font-medium transition-all"
              :class="accountType === 'driver'
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-form-border text-on-form-variant hover:border-brand-dark'"
              @click="accountType = 'driver'"
            >
              <Icon name="tabler:steering-wheel" size="16" />
              Taxista
            </button>
          </div>
        </div>

        <div v-if="error" class="text-error text-sm bg-red-50 rounded-input px-4 py-3">
          {{ error }}
        </div>

        <AppButton
          full-width
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          {{ isLogin ? 'Iniciar sesión' : 'Crear cuenta' }}
        </AppButton>
      </div>

      <div class="mt-4 pt-4 border-t border-surface-divider text-center">
        <button
          class="text-sm text-brand-gold hover:text-gold-600 transition-colors"
          @click="isLogin = !isLogin"
        >
          {{ isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const router = useRouter()

const isLogin = ref(true)
const showPassword = ref(false)
const email = ref('')
const password = ref('')
const fullName = ref('')
const accountType = ref<'client' | 'driver'>('client')
const loading = ref(false)
const error = ref('')
const errors = reactive({
  email: '',
  password: '',
  fullName: '',
})

const isFormValid = computed(() => {
  if (!email.value || !password.value) return false
  if (!isLogin.value && !fullName.value) return false
  return true
})

function validate() {
  errors.email = ''
  errors.password = ''
  errors.fullName = ''
  error.value = ''

  if (!email.value) {
    errors.email = 'El email es obligatorio'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.email = 'Email no válido'
    return false
  }
  if (!password.value) {
    errors.password = 'La contraseña es obligatoria'
    return false
  }
  if (password.value.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
    return false
  }
  if (!isLogin.value && !fullName.value) {
    errors.fullName = 'El nombre es obligatorio'
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return

  loading.value = true
  error.value = ''

  try {
    if (isLogin.value) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (signInError) throw signInError
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          data: {
            // El servidor solo admite `client` y `driver` aquí: el trigger de
            // alta acota el rol autoasignable. Ver la migración
            // 20260902081530_trigger_clamps_self_assigned_role.
            role: accountType.value,
            full_name: fullName.value,
          },
        },
      })
      if (signUpError) throw signUpError
    }

    // A dónde va después de entrar lo decide el rol de la tabla, no la
    // metadata: un administrador promovido cambiando `public.users.role`
    // aterrizaba en /taxista, o en la portada, según lo que dijera su
    // metadata. Ver composables/useRol.ts.
    const { olvidar, asegurar } = useRol()
    olvidar()
    const rol = await asegurar()
    if (rol === 'admin') {
      await router.push('/admin')
    } else if (rol === 'driver') {
      await router.push('/taxista')
    } else {
      await router.push('/')
    }
  } catch (e: any) {
    error.value = translateAuthError(e?.message)
  } finally {
    loading.value = false
  }
}

function translateAuthError(message?: string) {
  if (!message) return 'Error al procesar la solicitud'
  const map: Array<[string, string]> = [
    ['Invalid login credentials', 'Email o contraseña incorrectos'],
    ['Email not confirmed', 'Confirma tu email antes de iniciar sesión'],
    ['User already registered', 'Ya existe una cuenta con este email'],
    ['Password should be at least', 'La contraseña debe tener al menos 6 caracteres'],
    ['rate limit', 'Demasiados intentos. Espera unos minutos.'],
  ]
  for (const [en, es] of map) {
    if (message.toLowerCase().includes(en.toLowerCase())) return es
  }
  return message
}
</script>

<style scoped>
/* Mismo estilo que los inputs del formulario de búsqueda */
.login-input {
  width: 100%;
  height: 3rem;
  background: rgb(var(--color-brand-white));
  border: 2px solid rgb(var(--secondary));
  border-radius: 0.75rem;
  padding: 0 0.75rem 0 2.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--on-form));
  outline: none;
  transition: box-shadow 0.15s ease;
}
.login-input::placeholder {
  color: rgb(var(--on-form-muted));
  font-weight: 400;
}
.login-input:focus {
  box-shadow: 0 0 0 3px rgba(250, 189, 50, 0.25);
}
</style>
