<template>
  <span class="text-xs font-medium" :class="expired ? 'text-error' : 'text-white/45'">
    {{ expired ? 'Expirada' : remaining }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  until: string | Date
}>()

const expired = ref(false)
const remaining = ref('')

let interval: ReturnType<typeof setInterval> | null = null

function update() {
  const untilDate = new Date(props.until)
  const now = new Date()
  const diff = untilDate.getTime() - now.getTime()

  if (diff <= 0) {
    expired.value = true
    remaining.value = ''
    if (interval) clearInterval(interval)
    return
  }

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (minutes > 0) {
    remaining.value = `${minutes}m ${seconds}s`
  } else {
    remaining.value = `${seconds}s`
  }
}

onMounted(() => {
  update()
  interval = setInterval(update, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>
