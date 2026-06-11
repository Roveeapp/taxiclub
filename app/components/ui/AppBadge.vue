<template>
  <Tag :value="label" :severity="severity" :pt="tagPt" />
</template>

<script setup lang="ts">
import Tag from 'primevue/tag'

const props = defineProps<{
  variant: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'active'
  label: string
}>()

const severity = computed(() => {
  switch (props.variant) {
    case 'active': return 'warn'
    case 'confirmed': return 'info'
    case 'completed': return 'success'
    case 'cancelled': return 'danger'
    default: return 'secondary'
  }
})

const tagPt = {
  root: { class: '!rounded-full !text-[11px] !font-semibold !uppercase' },
}
</script>
