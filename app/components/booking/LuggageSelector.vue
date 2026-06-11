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
        <span class="text-lg font-bold text-slate-900">Especificar Equipaje</span>
      </div>
    </template>

    <p class="text-sm text-slate-500 mb-6 leading-relaxed">
      Por favor, indique el número de bultos para asignar el vehículo más adecuado a su club.
    </p>

    <div class="space-y-3">
      <!-- Maletas Grandes -->
      <div class="bg-slate-100 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
          <Icon name="tabler:circle" size="20" class="text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-slate-900">Maletas Grandes</p>
          <p class="text-sm text-slate-500">Máx. 23kg por bulto</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-10 h-10 rounded-full border-2 border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 text-lg font-bold flex items-center justify-center transition-colors"
            :disabled="big <= 0"
            @click="big--"
          >
            <Icon name="tabler:minus" size="18" />
          </button>
          <span class="text-lg font-bold text-slate-900 w-6 text-center">{{ big }}</span>
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-secondary text-white hover:bg-secondary/90 text-lg font-bold flex items-center justify-center transition-colors shadow-sm"
            :disabled="big >= 8"
            @click="big++"
          >
            <Icon name="tabler:plus" size="18" />
          </button>
        </div>
      </div>

      <!-- Equipaje de Mano -->
      <div class="bg-slate-100 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
          <Icon name="tabler:briefcase" size="20" class="text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-slate-900">Equipaje de Mano</p>
          <p class="text-sm text-slate-500">Cabina estándar</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-10 h-10 rounded-full border-2 border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800 text-lg font-bold flex items-center justify-center transition-colors"
            :disabled="hand <= 0"
            @click="hand--"
          >
            <Icon name="tabler:minus" size="18" />
          </button>
          <span class="text-lg font-bold text-slate-900 w-6 text-center">{{ hand }}</span>
          <button
            type="button"
            class="w-10 h-10 rounded-full bg-secondary text-white hover:bg-secondary/90 text-lg font-bold flex items-center justify-center transition-colors shadow-sm"
            :disabled="hand >= 8"
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
