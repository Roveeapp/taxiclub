<template>
  <div class="bg-white rounded-card p-6">
    <h3 class="text-lg font-medium text-text-on-light mb-4">Confirmar reserva</h3>

    <div class="space-y-4">
      <AppInput
        v-model="form.plate"
        label="Matrícula del vehículo"
        placeholder="Ej: 1234 ABC"
        required
      />

      <AppInput
        v-model="form.phone"
        label="Teléfono de contacto"
        type="tel"
        placeholder="+34 600 000 000"
        required
      />

      <label class="flex items-center gap-3 cursor-pointer">
        <input
          v-model="form.hasSub"
          type="checkbox"
          class="w-5 h-5 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
        />
        <span class="text-sm text-text-on-light">Gestionará el servicio un compañero</span>
      </label>

      <Transition name="expand">
        <div v-if="form.hasSub" class="space-y-4 pl-8">
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
      </Transition>

      <AppButton
        :disabled="!isFormValid"
        :loading="submitting"
        @click="handleSubmit"
      >
        Confirmar reserva
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  defaultPlate?: string
  defaultPhone?: string
}>()

const emit = defineEmits<{
  confirm: [data: any]
}>()

const submitting = ref(false)

const form = reactive({
  plate: props.defaultPlate || '',
  phone: props.defaultPhone || '',
  hasSub: false,
  subPlate: '',
  subPhone: '',
})

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
  max-height: 200px;
}
</style>
