<template>
  <div class="pt-6">
    <h1 class="text-[22px] font-medium text-white mb-4">Mis reservas</h1>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-white/5 rounded-card p-4">
        <AppSkeleton />
      </div>
    </div>

    <div v-else-if="bookings.length > 0" class="space-y-3">
      <NuxtLink
        v-for="booking in bookings"
        :key="booking.id"
        :to="`/reserva/${booking.id}`"
      >
        <BookingCard :booking="booking" />
      </NuxtLink>
    </div>

    <div v-else class="text-center py-12">
      <Icon name="tabler:calendar" size="48" class="mx-auto text-white/20 mb-4" />
      <p class="text-white/45 text-sm">No tienes reservas todavía</p>
      <NuxtLink to="/" class="text-brand-gold text-sm mt-2 inline-block">Hacer una reserva</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const user = useSupabaseUser()
const bookings = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await useSupabaseClient()
      .from('bookings')
      .select('*, booking_assignments(*), stations(name)')
      .eq('client_id', user.value?.id ?? '')
      .order('created_at', { ascending: false })

    bookings.value = (data || []).map((b: any) => ({
      ...b,
      originStationName: b.stations?.name || 'Parada',
      confirmedPlate: b.booking_assignments?.[0]?.confirmed_plate,
      confirmedPhone: b.booking_assignments?.[0]?.confirmed_phone,
    }))
  } catch (e) {
    console.error('Error loading bookings:', e)
  } finally {
    loading.value = false
  }
})
</script>
