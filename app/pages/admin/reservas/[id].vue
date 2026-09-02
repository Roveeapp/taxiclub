<template>
  <div>
    <NuxtLink to="/admin/reservas" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a reservas
    </NuxtLink>

    <div v-if="loading" class="card-surface rounded-xl p-6">
      <AppSkeleton />
    </div>

    <div v-else-if="booking" class="space-y-6 max-w-3xl">
      <div class="card-surface rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold text-on-surface">Reserva #{{ booking.id?.slice(0, 8) }}</h1>
          <AppBadge
            :variant="booking.status"
            :label="statusLabel(booking.status)"
          />
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="icon-wrap-dark">
              <Icon name="tabler:map-pin-2" size="14" class="text-brand-gold" />
            </div>
            <div>
              <span class="field-label block">ORIGEN</span>
              <span class="text-sm font-medium text-on-surface">{{ booking.origin_station_name }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="icon-wrap-gold">
              <Icon name="tabler:map-pin" size="14" class="text-brand-dark" />
            </div>
            <div>
              <span class="field-label block">DESTINO</span>
              <span class="text-sm font-medium text-on-surface">{{ booking.destination_address }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-surface-container rounded-xl p-4">
              <span class="field-label block mb-1">FECHA/HORA</span>
              <span class="text-sm font-medium text-on-surface">{{ formatDateTime(booking.pickup_at) }}</span>
            </div>
            <div class="bg-surface-container rounded-xl p-4">
              <span class="field-label block mb-1">PRECIO</span>
              <span class="text-sm font-medium text-on-surface">{{ Number(booking.total_price).toFixed(2) }} €</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Cliente</h2>
        <div class="space-y-2">
          <p class="text-sm text-on-surface">{{ booking.client_name || 'Sin nombre' }}</p>
          <p class="text-sm text-on-surface-variant">{{ booking.client_email || 'Sin email' }}</p>
        </div>
      </div>

      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4">Conductor</h2>

        <div v-if="booking.driver" class="flex items-start justify-between gap-4 mb-4">
          <div class="space-y-1">
            <p class="text-sm font-medium text-on-surface flex items-center gap-2">
              {{ booking.driver.name || 'Sin nombre' }}
              <span v-if="booking.driver.is_member" class="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary uppercase tracking-wide">
                <Icon name="tabler:crown" size="10" class="inline -mt-0.5" /> Club
              </span>
            </p>
            <p class="text-xs text-on-surface-variant">Licencia {{ booking.driver.license_number }} · {{ booking.driver.phone || booking.driver.email }}</p>
            <p v-if="booking.confirmed_plate" class="text-sm text-on-surface">
              Matrícula confirmada: <span class="font-semibold tracking-wider">{{ booking.confirmed_plate }}</span>
            </p>
            <p v-else class="text-xs text-warning">Pendiente de confirmar por el taxista</p>
          </div>
        </div>
        <p v-else class="text-sm text-on-surface-variant mb-4">
          Sin conductor asignado — la asignación automática no encontró ninguno disponible.
        </p>

        <p v-if="booking.offer_id" class="text-[11px] text-on-surface-variant flex items-center gap-1.5 border-t border-outline-variant pt-3">
          <Icon name="tabler:bolt" size="13" class="text-secondary" />
          Reserva de oferta de Última Hora: pertenece siempre al conductor que la publicó y no admite reasignación.
        </p>

        <div v-if="canAssign" class="border-t border-outline-variant pt-4">
          <label class="field-label block mb-1.5">{{ booking.driver ? 'Reasignar a otro taxista' : 'Asignar taxista' }}</label>
          <div class="flex flex-col sm:flex-row gap-3">
            <select v-model="selectedDriverId" class="assign-select flex-1">
              <option value="" disabled>Selecciona un taxista…</option>
              <option
                v-for="d in assignableDrivers"
                :key="d.id"
                :value="d.id"
                :disabled="d.id === booking.driver_id"
              >
                {{ d.is_member ? '👑 ' : '' }}{{ d.full_name }} — {{ d.license_number }}{{ d.id === booking.driver_id ? ' (actual)' : '' }}
              </option>
            </select>
            <AppButton
              :loading="assigning"
              :disabled="!selectedDriverId || selectedDriverId === booking.driver_id"
              @click="handleAssign"
            >
              <Icon name="tabler:user-check" size="16" class="mr-1.5" />
              {{ booking.driver ? 'Reasignar' : 'Asignar' }}
            </AppButton>
          </div>
          <p v-if="booking.driver" class="text-[11px] text-on-surface-variant mt-2">
            Al reasignar, la reserva vuelve a "pendiente" y el nuevo taxista deberá confirmar matrícula y teléfono.
          </p>
        </div>
      </div>

      <!-- Pago Stripe -->
      <div class="card-surface rounded-xl p-6">
        <h2 class="text-lg font-medium text-on-surface mb-4 flex items-center gap-2">
          <Icon name="tabler:brand-stripe" size="18" class="text-brand-gold" />
          Pago
        </h2>

        <div v-if="booking.deposit_amount" class="text-xs text-on-surface-variant mb-3">
          Reserva de oferta: la señal es el {{ Math.round(booking.deposit_amount / booking.total_price * 100) }}%
          ({{ Number(booking.deposit_amount).toFixed(2) }} €); el resto se paga al taxista.
        </div>

        <div v-if="booking.payment && !booking.payment.error" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-on-surface-variant">Estado</span>
            <span class="text-xs px-2.5 py-1 rounded-full font-medium" :class="paymentBadgeClass">
              {{ paymentStatusLabel }}
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-on-surface-variant">Importe</span>
            <span class="text-on-surface font-medium">{{ Number(booking.payment.amount).toFixed(2) }} €</span>
          </div>

          <div class="flex flex-wrap gap-2 pt-3 border-t border-outline-variant">
            <button
              v-if="booking.payment.status === 'requires_capture'"
              class="pay-btn pay-btn-gold"
              :disabled="payWorking"
              @click="paymentAction('capture')"
            >
              <Icon name="tabler:cash" size="15" /> Capturar cobro
            </button>
            <button
              v-if="['requires_capture', 'requires_payment_method', 'requires_confirmation'].includes(booking.payment.status)"
              class="pay-btn"
              :disabled="payWorking"
              @click="paymentAction('cancel')"
            >
              <Icon name="tabler:lock-open" size="15" /> Liberar retención
            </button>
            <button
              v-if="booking.payment.status === 'succeeded'"
              class="pay-btn pay-btn-red"
              :disabled="payWorking"
              @click="paymentAction('refund')"
            >
              <Icon name="tabler:receipt-refund" size="15" /> Reembolsar
            </button>
          </div>
        </div>

        <p v-else-if="booking.payment?.error" class="text-sm text-error">
          No se pudo consultar el pago en Stripe.
        </p>
        <p v-else class="text-sm text-on-surface-variant">
          Sin pago de Stripe asociado (reserva de prueba o pago en efectivo).
        </p>
      </div>

      <div v-if="booking.status !== 'cancelled' && booking.status !== 'completed'" class="flex gap-3">
        <AppButton
          variant="secondary"
          @click="handleCancel"
          :loading="cancelling"
        >
          Cancelar reserva
        </AppButton>
      </div>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" :type="toastType" />
  </div>
</template>

<style scoped>
.assign-select {
  background: rgb(var(--surface-container));
  border: 1px solid rgb(var(--outline-variant));
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: rgb(var(--on-surface));
  outline: none;
  transition: border-color 0.15s ease;
  min-width: 0;
}
.assign-select:focus {
  border-color: rgb(var(--secondary));
}
.assign-select option {
  background: rgb(var(--surface-container-low));
  color: rgb(var(--on-surface));
}

.pay-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgb(var(--outline-variant));
  background: rgb(var(--surface-container));
  color: rgb(var(--on-surface));
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pay-btn:hover:not(:disabled) {
  border-color: rgb(var(--secondary));
}
.pay-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pay-btn-gold {
  background: rgb(var(--secondary));
  border-color: rgb(var(--secondary));
  color: rgb(var(--color-brand-dark));
  font-weight: 600;
}
.pay-btn-red:hover:not(:disabled) {
  border-color: rgb(var(--status-error));
  color: rgb(var(--status-error));
}
</style>

<script setup lang="ts">
const { confirmar } = useConfirmacion()

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const booking = ref<any>(null)
const loading = ref(true)
const cancelling = ref(false)

// Asignación manual
const drivers = ref<any[]>([])
const selectedDriverId = ref('')
const assigning = ref(false)
const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const canAssign = computed(() =>
  booking.value
  && booking.value.status !== 'cancelled'
  && booking.value.status !== 'completed'
  // Las reservas de ofertas pertenecen siempre a su creador
  && !booking.value.offer_id,
)

// Activos y aprobados, miembros del club primero
const assignableDrivers = computed(() =>
  drivers.value
    .filter((d: any) => d.is_active && d.is_approved !== false)
    .sort((a: any, b: any) => Number(b.is_member) - Number(a.is_member) || String(a.full_name).localeCompare(String(b.full_name))),
)

async function handleAssign() {
  if (!selectedDriverId.value) return
  assigning.value = true
  try {
    await $fetch(`/api/admin/reservas/${route.params.id}/asignar`, {
      method: 'POST',
      body: { driverId: selectedDriverId.value },
    })
    await loadBooking()
    selectedDriverId.value = ''
    toastType.value = 'success'
    toastMessage.value = 'Taxista asignado y notificado'
    toastRef.value?.show()
  } catch (e: any) {
    toastType.value = 'error'
    toastMessage.value = e?.data?.message || 'No se pudo asignar el taxista'
    toastRef.value?.show()
  } finally {
    assigning.value = false
  }
}

async function loadBooking() {
  booking.value = await $fetch(`/api/admin/reservas/${route.params.id}`)
}

// ── Pago Stripe ────────────────────────────────────────
const payWorking = ref(false)

const paymentStatusLabel = computed(() => {
  switch (booking.value?.payment?.status) {
    case 'requires_capture': return 'Pre-autorizado'
    case 'succeeded': return 'Cobrado'
    case 'canceled': return 'Liberado'
    case 'processing': return 'Procesando'
    case 'requires_payment_method': return 'Sin completar'
    case 'requires_confirmation': return 'Sin confirmar'
    default: return booking.value?.payment?.status || '—'
  }
})

const paymentBadgeClass = computed(() => {
  switch (booking.value?.payment?.status) {
    case 'requires_capture': return 'bg-warning/15 text-warning'
    case 'succeeded': return 'bg-success/15 text-success'
    case 'canceled': return 'bg-surface-container-high text-on-surface-variant'
    default: return 'bg-info/15 text-info'
  }
})

async function paymentAction(action: 'capture' | 'cancel' | 'refund') {
  const labels = {
    capture: '¿Capturar el cobro de esta reserva?',
    cancel: '¿Liberar la retención? El cliente no pagará nada.',
    refund: '¿Reembolsar el importe completo al cliente?',
  }
  if (!await confirmar({
    titulo: 'Confirmar la acción',
    mensaje: labels[action] ?? '¿Seguro que quieres continuar?',
    destructivo: action === 'cancel' || action === 'refund',
  })) return

  payWorking.value = true
  try {
    await $fetch(`/api/admin/reservas/${route.params.id}/pago`, {
      method: 'POST',
      body: { action },
    })
    await loadBooking()
    toastType.value = 'success'
    toastMessage.value = 'Operación de pago completada'
    toastRef.value?.show()
  } catch (e: any) {
    toastType.value = 'error'
    toastMessage.value = e?.data?.message || 'La operación ha fallado'
    toastRef.value?.show()
  } finally {
    payWorking.value = false
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'confirmed': return 'Confirmada'
    case 'completed': return 'Completada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ' a las ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    await loadBooking()
  } catch (e) {
    console.error('Error loading booking:', e)
  } finally {
    loading.value = false
  }

  // Lista de taxistas para el selector (en paralelo, no bloquea)
  $fetch('/api/admin/conductores')
    .then((data) => { drivers.value = data as any[] })
    .catch((e) => console.error('Error loading drivers:', e))
})

async function handleCancel() {
  if (!await confirmar({
    titulo: 'Cancelar la reserva',
    mensaje: 'Se cancelará la reserva y se liberará la pre-autorización del pago, si la hubiera.',
    textoConfirmar: 'Cancelar la reserva',
    destructivo: true,
  })) return
  cancelling.value = true
  try {
    await $fetch(`/api/admin/reservas/${route.params.id}/cancelar`, {
      method: 'POST',
      body: { reason: 'Cancelada por administrador' },
    })
    booking.value = { ...booking.value, status: 'cancelled' }
  } catch (e) {
    console.error('Error cancelling booking:', e)
  } finally {
    cancelling.value = false
  }
}
</script>
