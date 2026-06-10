<template>
  <div>
    <NuxtLink to="/taxista/vehiculos" class="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
      <Icon name="ti:chevron-left" size="16" />
      Volver a vehículos
    </NuxtLink>

    <div class="bg-white rounded-xl p-6 border border-gray-200 max-w-2xl">
      <h1 class="text-xl font-semibold mb-6">{{ isEdit ? 'Editar vehículo' : 'Nuevo vehículo' }}</h1>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <AppInput v-model="form.plate" label="Matrícula" placeholder="1234 ABC" required />
          <AppInput v-model="form.color" label="Color" placeholder="Blanco, negro..." />
        </div>

        <div class="grid grid-cols-3 gap-4">
          <AppInput v-model="form.brand" label="Marca" placeholder="SEAT, Mercedes..." required />
          <AppInput v-model="form.model" label="Modelo" placeholder="León, Clase V..." required />
          <AppInput v-model="form.year" label="Año" type="number" placeholder="2023" />
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <span class="field-label block mb-2">Pasajeros</span>
            <AppStepper v-model="form.maxPassengers" :min="1" :max="9" />
          </div>
          <div>
            <span class="field-label block mb-2">Maletas grandes</span>
            <AppStepper v-model="form.maxLuggageBig" :min="0" :max="6" />
          </div>
          <div>
            <span class="field-label block mb-2">Equipaje mano</span>
            <AppStepper v-model="form.maxLuggageHand" :min="0" :max="10" />
          </div>
        </div>

        <div>
          <span class="field-label block mb-3">Extras</span>
          <div class="flex flex-wrap gap-2">
            <AppChip v-model:active="form.hasChildSeat" icon="ti:armchair">Silla bebé</AppChip>
            <AppChip v-model:active="form.hasPetFriendly" icon="ti:paw">Mascota</AppChip>
            <AppChip v-model:active="form.isAccessible" icon="ti:wheelchair">PMR</AppChip>
            <AppChip v-model:active="form.isLargeVehicle" icon="ti:car">Vehículo grande</AppChip>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <AppButton
            :loading="saving"
            @click="handleSave"
          >
            {{ isEdit ? 'Guardar cambios' : 'Añadir vehículo' }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.params.id && route.params.id !== 'nuevo')
const saving = ref(false)

const form = reactive({
  plate: '',
  brand: '',
  model: '',
  year: null as number | null,
  color: '',
  maxPassengers: 4,
  maxLuggageBig: 2,
  maxLuggageHand: 4,
  hasChildSeat: false,
  hasPetFriendly: false,
  isAccessible: false,
  isLargeVehicle: false,
})

onMounted(async () => {
  if (isEdit.value) {
    try {
      const data = await $fetch(`/api/taxista/vehiculos/${route.params.id}`)
      const v = data as any
      form.plate = v.plate
      form.brand = v.brand
      form.model = v.model
      form.year = v.year
      form.color = v.color
      form.maxPassengers = v.max_passengers
      form.maxLuggageBig = v.max_luggage_big
      form.maxLuggageHand = v.max_luggage_hand
      form.hasChildSeat = v.has_child_seat
      form.hasPetFriendly = v.has_pet_friendly
      form.isAccessible = v.is_accessible
      form.isLargeVehicle = v.is_large_vehicle
    } catch (e) {
      console.error('Error loading vehicle:', e)
    }
  }
})

async function handleSave() {
  if (!form.plate || !form.brand || !form.model) return

  saving.value = true
  try {
    if (isEdit.value) {
      await $fetch(`/api/taxista/vehiculos/${route.params.id}`, {
        method: 'PATCH',
        body: form,
      })
    } else {
      await $fetch('/api/taxista/vehiculos', {
        method: 'POST',
        body: form,
      })
    }
    router.push('/taxista/vehiculos')
  } catch (e) {
    console.error('Error saving vehicle:', e)
  } finally {
    saving.value = false
  }
}
</script>
