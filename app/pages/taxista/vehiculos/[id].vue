<template>
  <div>
    <NuxtLink to="/taxista/vehiculos" class="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface mb-4 transition-colors">
      <Icon name="tabler:chevron-left" size="16" />
      Volver a vehículos
    </NuxtLink>

    <div class="card-surface rounded-xl p-6 border border-outline-variant max-w-2xl">
      <h1 class="text-xl font-semibold mb-6">{{ isEdit ? 'Editar vehículo' : 'Nuevo vehículo' }}</h1>

      <div class="space-y-4">
        <!-- Foto del vehículo -->
        <div>
          <span class="field-label block mb-2">Foto del vehículo</span>
          <div
            class="relative h-44 rounded-xl overflow-hidden border-2 border-dashed transition-colors cursor-pointer"
            :class="photoPreview ? 'border-transparent' : 'border-outline-variant hover:border-secondary/60'"
            @click="photoInput?.click()"
          >
            <img
              v-if="photoPreview"
              :src="photoPreview"
              alt="Foto del vehículo"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-container">
              <Icon name="tabler:camera-plus" size="28" class="text-secondary" />
              <span class="text-sm text-on-surface-variant">Toca para añadir una foto</span>
              <span class="text-[11px] text-on-surface-variant/60">JPG, PNG o WebP · máx. 5 MB</span>
            </div>

            <div
              v-if="photoPreview"
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex justify-end gap-2"
            >
              <span class="text-xs text-white/90 mr-auto self-center flex items-center gap-1">
                <Icon v-if="uploadingPhoto" name="tabler:loader" size="14" class="animate-spin" />
                {{ uploadingPhoto ? 'Subiendo…' : 'Toca para cambiarla' }}
              </span>
            </div>
          </div>
          <input
            ref="photoInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onPhotoSelected"
          >
          <p v-if="photoError" class="text-xs text-error mt-1.5">{{ photoError }}</p>
          <p v-else-if="!isEdit && pendingPhotoFile" class="text-xs text-on-surface-variant mt-1.5">
            La foto se subirá al guardar el vehículo.
          </p>
        </div>

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
          <span class="field-label block mb-3">Accesorios y extras</span>
          <div v-if="allAccessories.length === 0" class="text-sm text-on-surface-variant">Cargando...</div>
          <div class="flex flex-wrap gap-2">
            <AppChip
              v-for="acc in allAccessories"
              :key="acc.id"
              :active="form.accessoryIds.includes(acc.id)"
              :icon="acc.icon"
              @update:active="(val: boolean) => toggleAccessory(acc.id, val)"
            >
              {{ acc.name }}
            </AppChip>
          </div>
        </div>

        <div class="pt-4 border-t border-outline-variant">
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
const allAccessories = ref<Array<{ id: string; name: string; icon: string }>>([])

// Foto del vehículo
const photoInput = ref<HTMLInputElement | null>(null)
const photoPreview = ref<string | null>(null)
const pendingPhotoFile = ref<File | null>(null)
const uploadingPhoto = ref(false)
const photoError = ref('')

function onPhotoSelected(event: Event) {
  photoError.value = ''
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoError.value = 'Formato no soportado (usa JPG, PNG o WebP)'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    photoError.value = 'La imagen supera el máximo de 5 MB'
    return
  }

  photoPreview.value = URL.createObjectURL(file)

  if (isEdit.value) {
    // Vehículo existente: subir inmediatamente
    uploadPhoto(route.params.id as string, file)
  } else {
    // Vehículo nuevo: se sube tras crearlo
    pendingPhotoFile.value = file
  }
}

async function uploadPhoto(vehicleId: string, file: File) {
  uploadingPhoto.value = true
  photoError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/taxista/vehiculos/${vehicleId}/foto`, { method: 'POST', body: fd })
  } catch (e: any) {
    photoError.value = e?.data?.message || 'No se pudo subir la foto'
  } finally {
    uploadingPhoto.value = false
  }
}

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
  accessoryIds: [] as string[],
})

function toggleAccessory(id: string, active: boolean) {
  if (active) {
    if (!form.accessoryIds.includes(id)) form.accessoryIds.push(id)
  } else {
    form.accessoryIds = form.accessoryIds.filter(a => a !== id)
  }
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/accessories')
    allAccessories.value = data as any[]
  } catch { /* */ }

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
      form.accessoryIds = Array.isArray(v.accessories) ? v.accessories.map((a: any) => a.id) : []
      photoPreview.value = v.photo_url || null
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
      const created: any = await $fetch('/api/taxista/vehiculos', {
        method: 'POST',
        body: form,
      })
      // Subir la foto pendiente al vehículo recién creado
      if (pendingPhotoFile.value && created?.id) {
        await uploadPhoto(created.id, pendingPhotoFile.value)
      }
    }
    router.push('/taxista/vehiculos')
  } catch (e) {
    console.error('Error saving vehicle:', e)
  } finally {
    saving.value = false
  }
}
</script>
