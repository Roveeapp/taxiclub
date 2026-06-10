<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6">Dashboard</h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <p class="text-sm text-gray-500 mb-1">Próximas reservas</p>
        <p class="text-3xl font-semibold text-gray-900">0</p>
      </div>
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <p class="text-sm text-gray-500 mb-1">Este mes</p>
        <p class="text-3xl font-semibold text-gray-900">0</p>
      </div>
      <div class="bg-white rounded-xl p-6 border border-gray-200">
        <p class="text-sm text-gray-500 mb-1">Ingresos estimados</p>
        <p class="text-3xl font-semibold text-gray-900">0 €</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>
