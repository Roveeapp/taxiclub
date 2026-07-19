<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-on-surface">Disponibilidad</h1>
      <p class="text-sm text-on-surface-variant mt-1">
        Por defecto estás disponible todos los días. Marca días libres o define franjas horarias.
      </p>
    </div>
    <div class="max-w-[1400px] w-full">
      <AvailabilityCalendar />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// La disponibilidad solo aplica a miembros (reparto automático)
onMounted(async () => {
  try {
    const me: any = await $fetch('/api/auth/me')
    if (me?.driver && me.driver.is_member === false) {
      navigateTo('/taxista')
    }
  } catch { /* seguir */ }
})
</script>
