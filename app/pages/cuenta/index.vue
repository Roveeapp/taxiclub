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

    <div v-if="user">
      <div class="bg-white/5 border border-white/10 rounded-card p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-14 h-14 rounded-full bg-brand-gold/10 flex items-center justify-center">
            <Icon name="tabler:user" size="24" class="text-brand-gold" />
          </div>
          <div>
            <p class="text-base font-medium text-white">{{ user.user_metadata?.full_name || 'Usuario' }}</p>
            <p class="text-sm text-white/45">{{ user.email }}</p>
            <span class="inline-block mt-1 text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-gold-50 text-gold-800">
              {{ roleLabel }}
            </span>
          </div>
        </div>

        <div class="space-y-3">
          <NuxtLink
            to="/cuenta/reservas"
            class="flex items-center justify-between p-3 rounded-input hover:bg-white/5 transition-colors"
          >
            <span class="flex items-center gap-3 text-sm text-white">
              <Icon name="tabler:calendar-event" size="18" class="text-white/45" />
              Mis reservas
            </span>
            <Icon name="tabler:chevron-right" size="16" class="text-white/45" />
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white/5 border border-white/10 rounded-card p-6 mt-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-medium text-white">Direcciones guardadas</h2>
          <button
            class="text-sm text-secondary font-medium hover:text-secondary/80 transition-colors"
            @click="showAddForm = !showAddForm"
          >
            <Icon name="tabler:plus" size="16" class="inline mr-1" />
            Añadir
          </button>
        </div>

        <div v-if="showAddForm" class="mb-4 p-4 bg-white/5 rounded-lg space-y-3">
          <div>
            <label class="text-xs text-white/45 uppercase block mb-1">Etiqueta</label>
            <InputText
              v-model="newAddress.label"
              placeholder="Casa, Trabajo, Gimnasio..."
              :pt="textPt"
              class="w-full"
            />
          </div>
          <div class="relative">
            <label class="text-xs text-white/45 uppercase block mb-1">Dirección</label>
            <InputText
              v-model="addressQuery"
              placeholder="Buscar dirección..."
              :pt="textPt"
              class="w-full"
              @input="onAddressSearch"
            />
            <div
              v-if="addressSuggestions.length > 0"
              class="absolute z-10 top-full left-0 right-0 bg-surface-container border border-white/10 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
            >
              <button
                v-for="s in addressSuggestions"
                :key="s.id"
                class="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 border-b border-white/5 last:border-0"
                @click="selectAddress(s)"
              >
                <span class="text-xs text-white/45">{{ s.label }}</span>
                <span class="block truncate">{{ s.description }}</span>
              </button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-white">
            <Checkbox v-model="newAddress.isFavorite" :binary="true" :pt="checkboxPt" />
            Marcar como favorito
          </label>
          <div class="flex gap-2">
            <AppButton :disabled="!canSave" @click="handleAddAddress">Guardar</AppButton>
            <button class="text-sm text-white/45 hover:text-white" @click="showAddForm = false">Cancelar</button>
          </div>
        </div>

        <div v-if="savedAddresses.length === 0 && !showAddForm" class="text-center py-4">
          <p class="text-sm text-white/45">No tienes direcciones guardadas</p>
        </div>

        <div class="space-y-2">
          <div
            v-for="addr in savedAddresses"
            :key="addr.id"
            class="flex items-center justify-between p-3 rounded-input hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                :class="addr.is_favorite ? 'bg-gold-50 text-gold-700' : 'bg-white/10 text-white/40'">
                <Icon :name="addr.is_favorite ? 'tabler:star-filled' : 'tabler:map-pin'" size="16" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium text-white">{{ addr.label }}</p>
                <p class="text-xs text-white/45 truncate">{{ addr.address }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                @click="toggleFavorite(addr)"
              >
                <Icon :name="addr.is_favorite ? 'tabler:star-filled' : 'tabler:star'" size="15"
                  :class="addr.is_favorite ? 'text-gold-500' : 'text-white/30'" />
              </button>
              <button
                class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"
                @click="handleDeleteAddress(addr.id)"
              >
                <Icon name="tabler:trash" size="15" class="text-white/30 hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white/5 border border-white/10 rounded-card p-6 text-center">
      <p class="text-white/45 mb-4">Inicia sesión para ver tu cuenta</p>
      <NuxtLink to="/cuenta/login">
        <AppButton>Iniciar sesión</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'

definePageMeta({ layout: 'default', middleware: 'auth' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()

const textPt = {
  root: { class: '!w-full !h-10 !rounded-lg !border !border-white/10 !text-sm !bg-white/5 !text-white !shadow-none' },
}

const checkboxPt = {
  root: { class: '!w-5 !h-5 !rounded' },
  input: { class: '!accent-secondary' },
}

// El rol lo dice el servidor: un administrador promovido en la tabla tenía
// metadata de `driver` y aquí se le mostraba «Taxista». Ver composables/useRol.ts.
const { rol } = useRol()
const roleLabel = computed(() => {
  switch (rol.value) {
    case 'client': return 'Cliente'
    case 'driver': return 'Taxista'
    case 'admin': return 'Administrador'
    default: return 'Usuario'
  }
})

const savedAddresses = ref<any[]>([])
const showAddForm = ref(false)
const addressQuery = ref('')
const addressSuggestions = ref<any[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

const newAddress = reactive({
  label: '',
  address: '',
  lat: null as number | null,
  lng: null as number | null,
  isFavorite: false,
})

const canSave = computed(() => newAddress.label.trim() && newAddress.address.trim())

async function loadAddresses() {
  try {
    savedAddresses.value = await $fetch('/api/saved-addresses') as any[]
  } catch { /* */ }
}

async function toggleFavorite(addr: any) {
  const newVal = !addr.is_favorite
  try {
    await $fetch(`/api/saved-addresses/${addr.id}`, {
      method: 'PATCH',
      body: { is_favorite: newVal },
    })
    addr.is_favorite = newVal
  } catch { /* */ }
}

async function handleAddAddress() {
  if (!canSave.value) return
  try {
    await $fetch('/api/saved-addresses', {
      method: 'POST',
      body: {
        label: newAddress.label.trim(),
        address: newAddress.address.trim(),
        lat: newAddress.lat,
        lng: newAddress.lng,
        is_favorite: newAddress.isFavorite,
      },
    })
    newAddress.label = ''
    newAddress.address = ''
    newAddress.lat = null
    newAddress.lng = null
    newAddress.isFavorite = false
    addressQuery.value = ''
    showAddForm.value = false
    await loadAddresses()
  } catch { /* */ }
}

async function handleDeleteAddress(id: string) {
  try {
    await $fetch(`/api/saved-addresses/${id}`, { method: 'DELETE' })
    savedAddresses.value = savedAddresses.value.filter((a: any) => a.id !== id)
  } catch { /* */ }
}

function onAddressSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (addressQuery.value.length < 3) { addressSuggestions.value = []; return }
    try {
      const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(addressQuery.value)}`)
      addressSuggestions.value = data as any[]
    } catch { addressSuggestions.value = [] }
  }, 300)
}

function selectAddress(s: any) {
  newAddress.address = s.description
  newAddress.lat = s.lat || null
  newAddress.lng = s.lng || null
  addressQuery.value = s.description
  addressSuggestions.value = []
  if (!newAddress.label && s.source === 'saved') {
    newAddress.label = s.label
  }
}

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/')
}

onMounted(() => {
  if (user.value) loadAddresses()
})

watch(user, (u) => {
  if (u) loadAddresses()
})
</script>
