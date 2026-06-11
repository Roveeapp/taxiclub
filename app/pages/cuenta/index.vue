<template>
  <div class="pt-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-[22px] font-medium text-white">Mi cuenta</h1>
      <button
        class="text-sm text-white/45 hover:text-white transition-colors"
        @click="handleLogout"
      >
        Cerrar sesión
      </button>
    </div>

    <div v-if="user" class="bg-white rounded-card p-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-full bg-brand-gold/10 flex items-center justify-center">
          <Icon name="tabler:user" size="24" class="text-brand-gold" />
        </div>
        <div>
          <p class="text-base font-medium text-text-on-light">{{ user.user_metadata?.full_name || 'Usuario' }}</p>
          <p class="text-sm text-text-muted-light">{{ user.email }}</p>
          <span class="inline-block mt-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-gold-50 text-gold-800">
            {{ roleLabel }}
          </span>
        </div>
      </div>

      <div class="space-y-3">
        <NuxtLink
          to="/cuenta/reservas"
          class="flex items-center justify-between p-3 rounded-input hover:bg-surface-input transition-colors"
        >
          <span class="flex items-center gap-3 text-sm text-text-on-light">
            <Icon name="tabler:calendar-event" size="18" class="text-text-muted-light" />
            Mis reservas
          </span>
          <Icon name="tabler:chevron-right" size="16" class="text-text-muted-light" />
        </NuxtLink>
      </div>
    </div>

    <div v-else class="bg-white rounded-card p-6 text-center">
      <p class="text-text-muted-light mb-4">Inicia sesión para ver tu cuenta</p>
      <NuxtLink to="/cuenta/login">
        <AppButton>Iniciar sesión</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()

const roleLabel = computed(() => {
  switch (user.value?.user_metadata?.role) {
    case 'client': return 'Cliente'
    case 'driver': return 'Taxista'
    case 'admin': return 'Administrador'
    default: return 'Usuario'
  }
})

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}
</script>
