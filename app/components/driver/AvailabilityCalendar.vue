<template>
  <div class="bg-white rounded-card p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-text-on-light">Disponibilidad</h3>
      <div class="flex items-center gap-2">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          @click="prevMonth"
        >
          <Icon name="tabler:chevron-left" size="18" />
        </button>
        <span class="text-sm font-medium text-text-on-light min-w-[120px] text-center">
          {{ monthLabel }}
        </span>
        <button
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          @click="nextMonth"
        >
          <Icon name="tabler:chevron-right" size="18" />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-2">
      <div v-for="day in weekDays" :key="day" class="text-center text-[11px] font-medium text-text-muted-light py-1">
        {{ day }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="day in calendarDays"
        :key="day.date"
        class="aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition-colors"
        :class="dayClass(day)"
        @click="toggleDay(day)"
      >
        {{ day.day }}
      </div>
    </div>

    <div class="flex items-center gap-4 mt-4 pt-4 border-t border-surface-divider">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-success/20 border border-success" />
        <span class="text-xs text-text-muted-light">Disponible</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
        <span class="text-xs text-text-muted-light">No disponible</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CalendarDay {
  date: string
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
  isAvailable: boolean
  isPast: boolean
}

const props = defineProps<{
  availability?: Array<{ date: string; isAvailable: boolean }>
}>()

const emit = defineEmits<{
  toggle: [date: string]
}>()

const currentDate = ref(new Date())
const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const monthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
})

const calendarDays = computed((): CalendarDay[] => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = (firstDay.getDay() + 6) % 7
  const days: CalendarDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(makeDay(d, false))
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i)
    days.push(makeDay(d, true))
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push(makeDay(d, false))
  }

  return days
})

function makeDay(date: Date, isCurrentMonth: boolean): CalendarDay {
  const dateStr = date.toISOString().split('T')[0]
  const avail = props.availability?.find(a => a.date === dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    date: dateStr,
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
    isCurrentMonth,
    isAvailable: avail?.isAvailable ?? true,
    isPast: date < today,
  }
}

function dayClass(day: CalendarDay) {
  if (!day.isCurrentMonth) return 'text-gray-200'
  if (day.isPast) return 'text-gray-300 cursor-default'
  if (day.isAvailable) return 'bg-success/10 text-success hover:bg-success/20 border border-success/30'
  return 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200'
}

function toggleDay(day: CalendarDay) {
  if (!day.isCurrentMonth || day.isPast) return
  emit('toggle', day.date)
}

function prevMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() - 1)
  currentDate.value = d
}

function nextMonth() {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + 1)
  currentDate.value = d
}
</script>
