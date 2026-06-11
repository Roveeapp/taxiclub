<template>
  <Transition name="toast">
    <div
      v-if="visible"
      class="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] max-w-[360px] w-full px-4"
    >
      <div
        class="flex items-center gap-3 px-4 py-3 rounded-btn shadow-lg"
        :class="toastClass"
      >
        <Icon :name="icon" size="18" />
        <span class="text-sm font-medium flex-1">{{ message }}</span>
        <button v-if="dismissible" class="opacity-60 hover:opacity-100" @click="hide">
          <Icon name="tabler:x" size="16" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  dismissible?: boolean
}>(), {
  type: 'info',
  duration: 4000,
  dismissible: true,
})

const visible = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

const icon = computed(() => {
  switch (props.type) {
    case 'success': return 'tabler:check'
    case 'error': return 'tabler:x'
    case 'warning': return 'tabler:alert-triangle'
    default: return 'tabler:info-circle'
  }
})

const toastClass = computed(() => {
  switch (props.type) {
    case 'success': return 'bg-success text-white'
    case 'error': return 'bg-error text-white'
    case 'warning': return 'bg-warning text-white'
    default: return 'bg-info text-white'
  }
})

function show() {
  visible.value = true
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(hide, props.duration)
}

function hide() {
  visible.value = false
  if (timeout) clearTimeout(timeout)
}

defineExpose({ show, hide })
</script>

<style scoped>
.toast-enter-active {
  transition: all 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 200ms ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
