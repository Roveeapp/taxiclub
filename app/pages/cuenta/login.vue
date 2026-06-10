<template>
  <div class="pt-8">
    <div class="text-center mb-8">
      <div class="flex justify-center mb-4">
        <div class="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <Icon name="ti:user" size="24" class="text-brand-gold" />
        </div>
      </div>
      <h1 class="text-[22px] font-medium text-white mb-1">
        {{ isLogin ? 'Iniciar sesión' : 'Crear cuenta' }}
      </h1>
      <p class="text-sm text-white/45">
        {{ isLogin ? 'Accede a tu cuenta de Club Taxis' : 'Regístrate para reservar tu taxi' }}
      </p>
    </div>

    <div class="bg-white rounded-card p-6">
      <div class="space-y-4">
        <AppInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="tu@email.com"
          :error="errors.email"
        />

        <AppInput
          v-model="password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres"
          :error="errors.password"
        />

        <div v-if="!isLogin">
          <AppInput
            v-model="fullName"
            label="Nombre completo"
            placeholder="Tu nombre y apellidos"
            :error="errors.fullName"
          />
        </div>

        <div v-if="!isLogin">
          <span class="field-label block mb-2">Tipo de cuenta</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="flex items-center justify-center gap-2 px-4 py-3 rounded-input border text-sm font-medium transition-all"
              :class="accountType === 'client'
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-gray-200 text-gray-600 hover:border-brand-dark'"
              @click="accountType = 'client'"
            >
              <Icon name="ti:user" size="16" />
              Cliente
            </button>
            <button
              class="flex items-center justify-center gap-2 px-4 py-3 rounded-input border text-sm font-medium transition-all"
              :class="accountType === 'driver'
                ? 'border-brand-dark bg-brand-dark text-white'
                : 'border-gray-200 text-gray-600 hover:border-brand-dark'"
              @click="accountType = 'driver'"
            >
              <Icon name="ti:steering-wheel" size="16" />
              Taxista
            </button>
          </div>
        </div>

        <div v-if="error" class="text-error text-sm bg-red-50 rounded-input px-4 py-3">
          {{ error }}
        </div>

        <AppButton
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
            role: accountType.value,
            full_name: fullName.value,
          },
        },
      })
      if (signUpError) throw signUpError
    }

    const user = useSupabaseUser()
    if (user.value) {
      const role = user.value.user_metadata?.role
      if (role === 'driver') {
        router.push('/taxista')
      } else if (role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    }
  } catch (e: any) {
    error.value = e.message || 'Error al procesar la solicitud'
  } finally {
    loading.value = false
  }
}
</script>
