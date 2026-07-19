<template>
  <div>
    <h3 class="text-lg font-medium text-on-surface mb-1">Confirmar reserva</h3>
    <p class="text-xs text-on-surface-variant mb-5">El cliente verá la matrícula y podrá llamarte a este teléfono.</p>

    <div class="space-y-5">
      <!-- Vehículo -->
      <div>
        <span class="field-label block mb-2">Vehículo</span>
        <div v-if="vehicles.length > 0" class="space-y-2 mb-2">
          <button
            v-for="v in vehicles"
            :key="v.id"
            type="button"
            class="vehicle-option"
            :class="{ 'vehicle-option-active': !manualPlate && form.plate === v.plate }"
            @click="selectVehicle(v)"
          >
            <div class="flex items-center rounded overflow-hidden flex-shrink-0">
              <div class="bg-info w-1.5 self-stretch" />
              <span class="bg-white text-brand-dark font-bold text-xs tracking-[0.12em] px-2 py-0.5">{{ v.plate }}</span>
            </div>
            <span class="text-sm flex-1 text-left">{{ v.brand }} {{ v.model }}</span>
            <Icon
              v-if="!manualPlate && form.plate === v.plate"
              name="tabler:circle-check-filled"
              size="18"
              class="text-secondary flex-shrink-0"
            />
          </button>
          <button
            type="button"
            class="vehicle-option"
            :class="{ 'vehicle-option-active': manualPlate }"
            @click="manualPlate = true; form.plate = ''"
          >
            <Icon name="tabler:pencil" size="16" class="text-on-surface-variant flex-shrink-0" />
            <span class="text-sm flex-1 text-left">Otra matrícula</span>
            <Icon v-if="manualPlate" name="tabler:circle-check-filled" size="18" class="text-secondary flex-shrink-0" />
          </button>
        </div>
        <AppInput
          v-if="manualPlate || vehicles.length === 0"
          v-model="form.plate"
          placeholder="Ej: 1234 ABC"
          required
        />
      </div>

      <!-- Teléfono -->
      <div>
        <span class="field-label block mb-2">Teléfono de contacto</span>
        <div v-if="myPhone" class="space-y-2 mb-2">
          <button
            type="button"
            class="vehicle-option"
            :class="{ 'vehicle-option-active': !manualPhone && form.phone === myPhone }"
            @click="manualPhone = false; form.phone = myPhone"
          >
            <Icon name="tabler:phone" size="16" class="text-secondary flex-shrink-0" />
            <span class="text-sm flex-1 text-left">{{ myPhone }} <span class="text-xs text-on-surface-variant">(mi teléfono)</span></span>
            <Icon
              v-if="!manualPhone && form.phone === myPhone"
              name="tabler:circle-check-filled"
              size="18"
              class="text-secondary flex-shrink-0"
            />
          </button>
          <button
            type="button"
            class="vehicle-option"
            :class="{ 'vehicle-option-active': manualPhone }"
            @click="manualPhone = true; form.phone = ''"
          >
            <Icon name="tabler:pencil" size="16" class="text-on-surface-variant flex-shrink-0" />
            <span class="text-sm flex-1 text-left">Otro teléfono</span>
            <Icon v-if="manualPhone" name="tabler:circle-check-filled" size="18" class="text-secondary flex-shrink-0" />
          </button>
        </div>
        <AppInput
          v-if="manualPhone || !myPhone"
          v-model="form.phone"
          type="tel"
          placeholder="+34 600 000 000"
          required
        />
      </div>

      <!-- Compañero -->
      <label class="flex items-center gap-3 cursor-pointer">
        <Checkbox v-model="form.hasSub" :binary="true" />
        <span class="text-sm text-on-surface">Gestionará el servicio un compañero</span>
      </label>

      <Transition name="expand">
        <div v-if="form.hasSub" class="space-y-4 pl-2 border-l-2 border-secondary/30 ml-2">
          <div class="pl-4 space-y-4">
            <AppInput
              v-model="form.subPlate"
              label="Matrícula del compañero"
              placeholder="Ej: 5678 DEF"
              required
            />
            <AppInput
              v-model="form.subPhone"
              label="Teléfono del compañero"
              type="tel"
              placeholder="+34 600 000 000"
              required
            />
          </div>
        </div>
      </Transition>

      <AppButton
        variant="gold"
        full-width
        :disabled="!isFormValid"
        :loading="submitting"
        @click="handleSubmit"
      >
        <Icon name="tabler:check" size="16" class="mr-1.5" />
        Confirmar reserva
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import Checkbox from 'primevue/checkbox'

const props = defineProps<{
  defaultPlate?: string
  defaultPhone?: string
}>()

const emit = defineEmits<{
  confirm: [data: any]
}>()

const submitting = ref(false)
const vehicles = ref<any[]>([])
const myPhone = ref('')
const manualPlate = ref(false)
const manualPhone = ref(false)

const form = reactive({
  plate: props.defaultPlate || '',
  phone: props.defaultPhone || '',
  hasSub: false,
  subPlate: '',
  subPhone: '',
})

onMounted(async () => {
  // Vehículos activos del taxista (preselecciona el primero)
  try {
    const data = await $fetch('/api/taxista/vehiculos') as any[]
    vehicles.value = (data || []).filter((v: any) => v.is_active !== false)
    if (!form.plate && vehicles.value.length > 0) {
      form.plate = vehicles.value[0].plate
    }
    if (vehicles.value.length === 0) manualPlate.value = true
  } catch {
    manualPlate.value = true
  }

  // Teléfono del perfil
  try {
    const me: any = await $fetch('/api/auth/me')
    myPhone.value = me?.phone || ''
    if (!form.phone && myPhone.value) form.phone = myPhone.value
    if (!myPhone.value) manualPhone.value = true
  } catch {
    manualPhone.value = true
  }
})

function selectVehicle(v: any) {
  manualPlate.value = false
  form.plate = v.plate
}

const isFormValid = computed(() => {
  if (!form.plate || !form.phone) return false
  if (form.hasSub && (!form.subPlate || !form.subPhone)) return false
  return true
})

async function handleSubmit() {
  if (!isFormValid.value) return
  submitting.value = true
  try {
    emit('confirm', { ...form })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.vehicle-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--outline-variant);
  background: var(--surface-container);
  color: var(--on-surface);
  cursor: pointer;
  transition: all 0.15s ease;
}
.vehicle-option:hover {
  border-color: rgba(250, 189, 50, 0.5);
}
.vehicle-option-active {
  border-color: var(--secondary);
  background: rgba(250, 189, 50, 0.08);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 200ms ease-out;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 250px;
}
</style>
