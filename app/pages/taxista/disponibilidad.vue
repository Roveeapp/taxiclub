<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Disponibilidad</h1>
    <AvailabilityCalendar
      :availability="availability"
      @toggle="handleToggle"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const user = useSupabaseUser()
const availability = ref<any[]>([])

onMounted(async () => {
  try {
    const data = await $fetch('/api/taxista/disponibilidad')
    availability.value = data as any[]
  } catch (e) {
    console.error('Error loading availability:', e)
  }
})

async function handleToggle(date: string) {
  const current = availability.value.find((a: any) => a.date === date)
  const isAvailable = current ? !current.is_available : false

  try {
    await $fetch('/api/taxista/disponibilidad', {
      method: 'PATCH',
      body: { date, isAvailable },
    })

    if (current) {
      current.is_available = isAvailable
    } else {
      availability.value.push({ date, isAvailable })
    }
  } catch (e) {
    console.error('Error toggling availability:', e)
  }
}
</script>
