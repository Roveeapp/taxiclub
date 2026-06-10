<template>
  <div class="pt-6">
    <h1 class="text-[28px] font-semibold leading-tight mb-6">
      ¿A dónde te<br />llevamos?
    </h1>
    <SearchForm />
    <div class="mt-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="brand-dot" />
        <h2 class="text-lg font-medium text-white">Última Hora</h2>
      </div>
      <div class="text-sm text-white/45">
        No hay ofertas disponibles en este momento
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>
