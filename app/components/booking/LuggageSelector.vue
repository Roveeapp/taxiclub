<template>
  <Dialog
    :visible="visible"
    modal
    :closable="false"
    :style="{ width: '90vw', maxWidth: '420px' }"
    class="luggage-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <Icon name="tabler:briefcase" size="24" class="text-secondary" />
        <span class="text-lg font-bold text-on-form">Especificar Equipaje</span>
      </div>
    </template>

    <p class="text-sm text-on-form-muted mb-6 leading-relaxed">
      Por favor, indique el número de bultos para asignar el vehículo más adecuado a su club.
    </p>

    <div class="space-y-3">
      <!-- Maletas Grandes -->
      <div class="bg-form-surface rounded-2xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center flex-shrink-0">
          <Icon name="tabler:circle" size="20" class="text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-on-form">Maletas Grandes</p>
          <p class="text-sm text-on-form-muted">Máx. 23kg por bulto</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-10 h-10 rounded-full border-2 border-form-border text-on-form-variant hover:border-form-border hover:text-on-form text-lg font-bold flex items-center justify-center transition-colors"
            :disabled="big <= 0"
            aria-label="Quitar una maleta grande"
            @click="big--"
          >
            <Icon name="tabler:minus" size="18" />
          </button>
          <span class="text-lg font-bold text-on-form w-6 text-center" aria-live="polite" :aria-label="`${big} maletas grandes`">{{ big }}</span>
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-secondary text-on-secondary hover:bg-secondary/90 text-lg font-bold flex items-center justify-center transition-colors shadow-sm"
            :disabled="big >= 8"
            aria-label="Añadir una maleta grande"
            @click="big++"
          >
            <Icon name="tabler:plus" size="18" />
          </button>
        </div>
      </div>

      <!-- Equipaje de Mano -->
      <div class="bg-form-surface rounded-2xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center flex-shrink-0">
          <Icon name="tabler:briefcase" size="20" class="text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-on-form">Equipaje de Mano</p>
          <p class="text-sm text-on-form-muted">Cabina estándar</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-10 h-10 rounded-full border-2 border-form-border text-on-form-variant hover:border-form-border hover:text-on-form text-lg font-bold flex items-center justify-center transition-colors"
            :disabled="hand <= 0"
            aria-label="Quitar un bulto de mano"
            @click="hand--"
          >
            <Icon name="tabler:minus" size="18" />
          </button>
          <span class="text-lg font-bold text-on-form w-6 text-center">{{ hand }}</span>
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-secondary text-on-secondary hover:bg-secondary/90 text-lg font-bold flex items-center justify-center transition-colors shadow-sm"
            :disabled="hand >= 8"
            aria-label="Añadir un bulto de mano"
            @click="hand++"
          >
            <Icon name="tabler:plus" size="18" />
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 pt-2">
        <Button
          label="Cancelar"
          class="flex-1"
          severity="secondary"
          outlined
          @click="$emit('update:visible', false)"
        />
        <Button
          label="Confirmar"
          class="flex-1"
          severity="primary"
          @click="confirm"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const props = defineProps<{
  visible: boolean
  initialBig: number
  initialHand: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [big: number, hand: number]
}>()

const big = ref(props.initialBig)
const hand = ref(props.initialHand)

watch(() => props.visible, (v) => {
  if (v) {
    big.value = props.initialBig
    hand.value = props.initialHand
  }
})

function confirm() {
  emit('confirm', big.value, hand.value)
  emit('update:visible', false)
}
</script>

<style scoped>
.luggage-dialog :deep(.p-dialog-content) {
  padding: 0 1.5rem 1.5rem;
}
.luggage-dialog :deep(.p-dialog-header) {
  padding: 1.5rem 1.5rem 0.75rem;
}
.luggage-dialog :deep(.p-dialog-footer) {
  padding: 0 1.5rem 1.5rem;
}
.luggage-dialog :deep(.p-dialog) {
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
</style>
