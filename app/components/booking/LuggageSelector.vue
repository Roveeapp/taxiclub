<template>
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <Icon name="ti:users" size="16" class="text-text-muted-light" />
      <AppStepper v-model="passengers" :min="1" :max="8" />
    </div>
    <div class="flex items-center gap-2">
      <Icon name="ti:luggage" size="16" class="text-text-muted-light" />
      <AppStepper v-model="luggageBig" :min="0" :max="5" />
    </div>
    <div class="flex items-center gap-2">
      <Icon name="ti:briefcase" size="16" class="text-text-muted-light" />
      <AppStepper v-model="luggageHand" :min="0" :max="10" />
    </div>
  </div>
</template>

<script setup lang="ts">
const passengers = defineModel<number>('passengers', { default: 1 })
const luggageBig = defineModel<number>('luggageBig', { default: 0 })
const luggageHand = defineModel<number>('luggageHand', { default: 0 })
</script>
