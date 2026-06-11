<template>
  <div>
    <NuxtLink to="/taxista/reservas" class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a reservas
    </NuxtLink>

    <div v-if="loading" class="bg-white rounded-xl p-6 border border-gray-200">
      <AppSkeleton />
    </div>

    <div v-else-if="reservation" class="space-y-6">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold">Detalle de reserva</h1>
          <AppBadge
            :variant="reservation.status"
            :label="statusLabel(reservation.status)"
          />
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="icon-wrap-dark">
              <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
            </div>
            <div>
              <span class="field-label block">ORIGEN</span>
              <span class="text-sm font-medium text-gray-900">{{ reservation.origin_station_name }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="icon-wrap-gold">
              <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
            </div>
            <div>
              <span class="field-label block">DESTINO</span>
              <span class="text-sm font-medium text-gray-900">{{ reservation.destination_address }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <span class="field-label block mb-1">FECHA</span>
              <span class="text-sm font-medium text-gray-900">{{ formatDate(reservation.pickup_at) }}</span>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <span class="field-label block mb-1">HORA</span>
              <span class="text-sm font-medium text-gray-900">{{ formatTime(reservation.pickup_at) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <Icon name="tabler:users" size="18" class="mx-auto text-gray-400 mb-1" />
              <span class="text-sm font-medium text-gray-900">{{ reservation.passengers }}</span>
              <span class="text-xs text-gray-500 block">pasajeros</span>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <Icon name="tabler:luggage" size="18" class="mx-auto text-gray-400 mb-1" />
              <span class="text-sm font-medium text-gray-900">{{ reservation.luggage_big }}</span>
              <span class="text-xs text-gray-500 block">maletas</span>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 text-center">
              <Icon name="tabler:briefcase" size="18" class="mx-auto text-gray-400 mb-1" />
              <span class="text-sm font-medium text-gray-900">{{ reservation.luggage_hand }}</span>
              <span class="text-xs text-gray-500 block">mano</span>
            </div>
          </div>

          <div v-if="hasExtras" class="flex flex-wrap gap-2">
            <span v-if="reservation.needs_child_seat" class="text-xs bg-gold-50 text-gold-800 px-3 py-1 rounded-full">Silla bebé</span>
            <span v-if="reservation.needs_pet_friendly" class="text-xs bg-gold-50 text-gold-800 px-3 py-1 rounded-full">Mascota</span>
            <span v-if="reservation.needs_accessible" class="text-xs bg-gold-50 text-gold-800 px-3 py-1 rounded-full">PMR</span>
            <span v-if="reservation.needs_large_vehicle" class="text-xs bg-gold-50 text-gold-800 px-3 py-1 rounded-full">Vehículo grande</span>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-gray-200">
            <span class="text-sm text-gray-500">Precio total</span>
            <span class="text-xl font-semibold text-brand-gold">{{ Number(reservation.total_price).toFixed(2) }} €</span>
          </div>
        </div>
      </div>

      <div v-if="reservation.client_name" class="bg-white rounded-xl p-6 border border-gray-200">
        <h2 class="text-lg font-medium mb-3">Datos del cliente</h2>
        <p class="text-sm text-gray-900">{{ reservation.client_name }}</p>
        <p v-if="reservation.client_phone" class="text-sm text-gray-500">{{ reservation.client_phone }}</p>
      </div>

      <div v-if="!reservation.confirmed_at && reservation.status === 'pending'" class="bg-white rounded-xl p-6 border border-gray-200">
        <ConfirmBookingForm
          @confirm="handleConfirm"
        />
      </div>

      <div v-else-if="reservation.confirmed_at" class="bg-success/5 rounded-xl p-6 border border-success/20">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="tabler:check" size="18" class="text-success" />
          <h2 class="text-lg font-medium text-success">Reserva confirmada</h2>
        </div>
        <div class="space-y-2 text-sm">
          <p><span class="text-gray-500">Matrícula:</span> <span class="font-medium">{{ reservation.confirmed_plate }}</span></p>
          <p><span class="text-gray-500">Teléfono:</span> <span class="font-medium">{{ reservation.confirmed_phone }}</span></p>
          <p v-if="reservation.has_substitute">
            <span class="text-gray-500">Sustituto:</span>
            <span class="font-medium">{{ reservation.substitute_plate }} — {{ reservation.substitute_phone }}</span>
          </p>
        </div>
      </div>

      <div v-if="reservation.status === 'confirmed'" class="flex gap-3">
        <AppButton
          variant="gold"
          @click="handleComplete"
          :loading="completing"
        >
          Marcar como completada
        </AppButton>
        <NuxtLink to="/taxista/ofertas/nueva">
          <AppButton variant="secondary">
            Crear oferta de retorno
          </AppButton>
        </NuxtLink>
      </div>
    </div>

    <div v-else class="bg-white rounded-xl p-12 border border-gray-200 text-center">
      <p class="text-gray-400">Reserva no encontrada</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()

const reservation = ref<any>(null)
const loading = ref(true)
const completing = ref(false)

const hasExtras = computed(() =>
  reservation.value?.needs_child_seat || reservation.value?.needs_pet_friendly ||
  reservation.value?.needs_accessible || reservation.value?.needs_large_vehicle,
)

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const data = await $fetch(`/api/taxista/reservas/${route.params.id}`)
    reservation.value = data
  } catch (e) {
    console.error('Error loading reservation:', e)
  } finally {
    loading.value = false
  }
})

async function handleConfirm(data: any) {
  try {
    await $fetch(`/api/taxista/reservas/${route.params.id}/confirmar`, {
      method: 'POST',
      body: data,
    })
    reservation.value = {
      ...reservation.value,
      status: 'confirmed',
      confirmed_at: new Date(),
      confirmed_plate: data.plate,
      confirmed_phone: data.phone,
      has_substitute: data.hasSub,
      substitute_plate: data.subPlate,
      substitute_phone: data.subPhone,
    }
  } catch (e) {
    console.error('Error confirming reservation:', e)
  }
}

async function handleComplete() {
  completing.value = true
  try {
    await $fetch(`/api/taxista/reservas/${route.params.id}/completar`, {
      method: 'POST',
    })
    reservation.value = { ...reservation.value, status: 'completed' }
  } catch (e) {
    console.error('Error completing reservation:', e)
  } finally {
    completing.value = false
  }
}
</script>
