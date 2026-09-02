<template>
  <div class="space-y-6">
    <!-- Calendario -->
    <div class="card-surface rounded-xl p-4 md:p-6 border border-outline-variant">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-medium text-on-surface">Calendario</h3>
          <p class="text-xs text-on-surface-variant">Toca un día para editar su horario</p>
        </div>
        <div class="flex items-center gap-1">
          <button class="nav-btn" aria-label="Mes anterior" @click="prevMonth">
            <Icon name="tabler:chevron-left" size="18" />
          </button>
          <span class="text-sm font-medium text-on-surface min-w-[130px] text-center capitalize">
            {{ monthLabel }}
          </span>
          <button class="nav-btn" aria-label="Mes siguiente" @click="nextMonth">
            <Icon name="tabler:chevron-right" size="18" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1.5 mb-1.5">
        <div v-for="wd in weekDays" :key="wd" class="text-center text-[11px] font-semibold text-on-surface-variant uppercase py-1">
          {{ wd }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1.5">
        <div v-for="(day, i) in calendarDays" :key="i">
          <button
            v-if="day"
            type="button"
            class="day-cell"
            :class="dayClass(day)"
            :disabled="day.isPast"
            :aria-label="etiquetaDia(day)"
            @click="openDayEditor(day)"
          >
            <span class="day-number">{{ day.dayNum }}</span>
            <span v-if="day.state === 'off'" class="day-info text-status-error/90">No disp.</span>
            <template v-else-if="day.state === 'partial'">
              <span v-for="slot in day.slots.slice(0, 2)" :key="slot.from" class="day-info text-secondary">
                {{ slot.from }}–{{ slot.to }}
              </span>
              <span v-if="day.slots.length > 2" class="day-info text-on-surface-variant">+{{ day.slots.length - 2 }}</span>
            </template>
            <span v-else-if="!day.isPast" class="day-info text-success/80">Todo el día</span>
          </button>
        </div>
      </div>

      <!-- Leyenda -->
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-outline-variant">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-success/15 border border-success/60" />
          <span class="text-xs text-on-surface-variant">Disponible todo el día</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-secondary/15 border border-secondary/70" />
          <span class="text-xs text-on-surface-variant">Por franjas</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-status-error/15 border border-status-error/60" />
          <span class="text-xs text-on-surface-variant">No disponible</span>
        </div>
      </div>
    </div>

    <!-- Edición en lote -->
    <div class="card-surface rounded-xl p-4 md:p-6 border border-outline-variant">
      <button type="button" class="w-full flex items-center justify-between" @click="batchOpen = !batchOpen">
        <div class="text-left">
          <h3 class="text-lg font-medium text-on-surface flex items-center gap-2">
            <Icon name="tabler:calendar-cog" size="18" class="text-secondary" />
            Edición en lote
          </h3>
          <p class="text-xs text-on-surface-variant">Aplica el mismo horario a un rango de días (ej. del 20 al 24, de 9:00 a 15:00 y de 16:00 a 20:00)</p>
        </div>
        <Icon :name="batchOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'" size="18" class="text-on-surface-variant flex-shrink-0" />
      </button>

      <div v-if="batchOpen" class="mt-5 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label block mb-1.5">Desde</label>
            <input v-model="batch.dateFrom" type="date" :min="todayStr" class="av-input">
          </div>
          <div>
            <label class="field-label block mb-1.5">Hasta</label>
            <input v-model="batch.dateTo" type="date" :min="batch.dateFrom || todayStr" class="av-input">
          </div>
        </div>

        <div>
          <label class="field-label block mb-1.5">Estado</label>
          <div class="flex gap-2">
            <button type="button" class="state-btn" :class="{ 'state-btn-on': batch.isAvailable }" @click="batch.isAvailable = true">
              <Icon name="tabler:check" size="15" /> Disponible
            </button>
            <button type="button" class="state-btn state-btn-red" :class="{ 'state-btn-off': !batch.isAvailable }" @click="batch.isAvailable = false">
              <Icon name="tabler:ban" size="15" /> No disponible
            </button>
          </div>
        </div>

        <div v-if="batch.isAvailable">
          <label class="field-label block mb-1.5">Franjas horarias</label>
          <p class="text-[11px] text-on-surface-variant mb-2">Sin franjas = disponible todo el día</p>
          <div class="space-y-2">
            <div v-for="(slot, i) in batch.slots" :key="i" class="flex items-center gap-2">
              <input v-model="slot.from" type="time" class="av-input flex-1">
              <span class="text-on-surface-variant text-sm">a</span>
              <input v-model="slot.to" type="time" class="av-input flex-1">
              <button type="button" class="remove-btn" aria-label="Quitar franja" @click="batch.slots.splice(i, 1)">
                <Icon name="tabler:x" size="14" />
              </button>
            </div>
          </div>
          <button v-if="batch.slots.length < 6" type="button" class="add-slot-btn" @click="batch.slots.push({ from: '09:00', to: '15:00' })">
            <Icon name="tabler:plus" size="14" /> Añadir franja
          </button>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <AppButton :loading="savingBatch" :disabled="!batch.dateFrom || !batch.dateTo" @click="applyBatch">
            Aplicar al rango
          </AppButton>
          <span v-if="batchSummary" class="text-xs text-on-surface-variant">{{ batchSummary }}</span>
        </div>
      </div>
    </div>

    <!-- Modal de edición de un día -->
    <Teleport to="body">
      <div v-if="editorOpen" class="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="editorOpen = false" />
        <div class="relative w-full sm:max-w-md bg-surface-container-low border border-outline-variant rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-on-surface capitalize">{{ editorDateLabel }}</h3>
            <button class="nav-btn" aria-label="Cerrar" @click="editorOpen = false">
              <Icon name="tabler:x" size="16" />
            </button>
          </div>

          <div class="flex gap-2 mb-4">
            <button type="button" class="state-btn flex-1" :class="{ 'state-btn-on': editor.isAvailable }" @click="editor.isAvailable = true">
              <Icon name="tabler:check" size="15" /> Disponible
            </button>
            <button type="button" class="state-btn state-btn-red flex-1" :class="{ 'state-btn-off': !editor.isAvailable }" @click="editor.isAvailable = false">
              <Icon name="tabler:ban" size="15" /> No disponible
            </button>
          </div>

          <div v-if="editor.isAvailable" class="mb-4">
            <label class="field-label block mb-1.5">Franjas horarias</label>
            <p class="text-[11px] text-on-surface-variant mb-2">Sin franjas = disponible todo el día</p>
            <div class="space-y-2">
              <div v-for="(slot, i) in editor.slots" :key="i" class="flex items-center gap-2">
                <input v-model="slot.from" type="time" class="av-input flex-1">
                <span class="text-on-surface-variant text-sm">a</span>
                <input v-model="slot.to" type="time" class="av-input flex-1">
                <button type="button" class="remove-btn" aria-label="Quitar franja" @click="editor.slots.splice(i, 1)">
                  <Icon name="tabler:x" size="14" />
                </button>
              </div>
            </div>
            <button v-if="editor.slots.length < 6" type="button" class="add-slot-btn" @click="editor.slots.push({ from: '09:00', to: '15:00' })">
              <Icon name="tabler:plus" size="14" /> Añadir franja
            </button>
          </div>

          <p v-if="editorError" class="text-xs text-error mb-3">{{ editorError }}</p>

          <AppButton :loading="savingDay" class="w-full" @click="saveDay">
            Guardar
          </AppButton>
        </div>
      </div>
    </Teleport>

    <AppToast ref="toastRef" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
interface TimeSlot { from: string, to: string }
interface DayCell {
  date: string
  dayNum: number
  isPast: boolean
  state: 'full' | 'partial' | 'off'
  slots: TimeSlot[]
}

const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const current = ref(new Date())
const availability = ref<Map<string, { is_available: boolean, slots: TimeSlot[] }>>(new Map())

const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const todayStr = new Date().toISOString().slice(0, 10)

const monthLabel = computed(() =>
  current.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
)

const calendarDays = computed<Array<DayCell | null>>(() => {
  const year = current.value.getFullYear()
  const month = current.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Lunes = 0
  const offset = (firstDay.getDay() + 6) % 7

  const cells: Array<DayCell | null> = Array.from({ length: offset }, () => null)
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const row = availability.value.get(date)
    let state: DayCell['state'] = 'full'
    let slots: TimeSlot[] = []
    if (row) {
      if (!row.is_available) state = 'off'
      else if (row.slots.length > 0) { state = 'partial'; slots = row.slots }
    }
    cells.push({ date, dayNum: d, isPast: date < todayStr, state, slots })
  }
  return cells
})

/**
 * Nombre accesible de una casilla del calendario. El botón ya contenía texto
 * —el número y las franjas—, así que se anunciaba, pero sin la fecha completa
 * ni el estado: «14» no dice de qué mes ni si el conductor está disponible.
 */
function etiquetaDia(day: { date: string, dayNum: number, state: string, isPast: boolean, slots: Array<{ from: string, to: string }> }): string {
  const fecha = new Date(day.date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  if (day.isPast) return `${fecha}, ya pasado`
  if (day.state === 'off') return `${fecha}, no disponible`
  if (day.state === 'partial') {
    const franjas = day.slots.map(s => `de ${s.from} a ${s.to}`).join(' y ')
    return `${fecha}, disponible ${franjas}`
  }
  return `${fecha}, disponible todo el día`
}

function dayClass(day: DayCell) {
  if (day.isPast) return 'day-past'
  switch (day.state) {
    case 'off': return 'day-off'
    case 'partial': return 'day-partial'
    default: return 'day-full'
  }
}

function prevMonth() {
  current.value = new Date(current.value.getFullYear(), current.value.getMonth() - 1, 1)
}
function nextMonth() {
  current.value = new Date(current.value.getFullYear(), current.value.getMonth() + 1, 1)
}

// ── Carga ──────────────────────────────────────────────
async function load() {
  try {
    const rows = await $fetch('/api/taxista/disponibilidad') as any[]
    const map = new Map<string, { is_available: boolean, slots: TimeSlot[] }>()
    for (const r of rows) {
      let slots: TimeSlot[] = []
      if (Array.isArray(r.time_slots)) slots = r.time_slots
      else if (r.hour_from && r.hour_to) slots = [{ from: String(r.hour_from).slice(0, 5), to: String(r.hour_to).slice(0, 5) }]
      map.set(r.date, { is_available: r.is_available !== false, slots })
    }
    availability.value = map
  } catch (e) {
    console.error('Error loading availability:', e)
  }
}

onMounted(load)

function notify(type: 'success' | 'error', message: string) {
  toastType.value = type
  toastMessage.value = message
  toastRef.value?.show()
}

function validSlots(slots: TimeSlot[]): string | null {
  for (const s of slots) {
    if (!s.from || !s.to) return 'Completa todas las franjas'
    if (s.from >= s.to) return `La franja ${s.from}–${s.to} no es válida`
  }
  return null
}

// ── Editor de día ──────────────────────────────────────
const editorOpen = ref(false)
const savingDay = ref(false)
const editorError = ref('')
const editor = reactive<{ date: string, isAvailable: boolean, slots: TimeSlot[] }>({
  date: '',
  isAvailable: true,
  slots: [],
})

const editorDateLabel = computed(() => {
  if (!editor.date) return ''
  return new Date(`${editor.date}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
})

function openDayEditor(day: DayCell) {
  editor.date = day.date
  editor.isAvailable = day.state !== 'off'
  editor.slots = day.slots.map(s => ({ ...s }))
  editorError.value = ''
  editorOpen.value = true
}

async function saveDay() {
  editorError.value = ''
  if (editor.isAvailable) {
    const err = validSlots(editor.slots)
    if (err) { editorError.value = err; return }
  }
  savingDay.value = true
  try {
    await $fetch('/api/taxista/disponibilidad', {
      method: 'PATCH',
      body: {
        date: editor.date,
        isAvailable: editor.isAvailable,
        timeSlots: editor.isAvailable ? editor.slots : undefined,
      },
    })
    await load()
    editorOpen.value = false
    notify('success', 'Disponibilidad guardada')
  } catch (e: any) {
    editorError.value = e?.data?.message || 'No se pudo guardar'
  } finally {
    savingDay.value = false
  }
}

// ── Lote ───────────────────────────────────────────────
const batchOpen = ref(false)
const savingBatch = ref(false)
const batch = reactive<{ dateFrom: string, dateTo: string, isAvailable: boolean, slots: TimeSlot[] }>({
  dateFrom: '',
  dateTo: '',
  isAvailable: true,
  slots: [{ from: '09:00', to: '15:00' }],
})

const batchSummary = computed(() => {
  if (!batch.dateFrom || !batch.dateTo) return ''
  const days = Math.round((new Date(batch.dateTo).getTime() - new Date(batch.dateFrom).getTime()) / 86400000) + 1
  if (days < 1) return ''
  return `${days} ${days === 1 ? 'día' : 'días'}`
})

async function applyBatch() {
  if (batch.isAvailable) {
    const err = validSlots(batch.slots)
    if (err) { notify('error', err); return }
  }
  savingBatch.value = true
  try {
    const res: any = await $fetch('/api/taxista/disponibilidad', {
      method: 'PATCH',
      body: {
        dateFrom: batch.dateFrom,
        dateTo: batch.dateTo,
        isAvailable: batch.isAvailable,
        timeSlots: batch.isAvailable ? batch.slots : undefined,
      },
    })
    await load()
    notify('success', `Horario aplicado a ${res?.days ?? ''} días`)
  } catch (e: any) {
    notify('error', e?.data?.message || 'No se pudo aplicar el horario')
  } finally {
    savingBatch.value = false
  }
}
</script>

<style scoped>
.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--on-surface-variant));
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.nav-btn:hover {
  background: rgb(var(--surface-container-high));
  color: rgb(var(--on-surface));
}

.day-cell {
  width: 100%;
  min-height: 62px;
  border-radius: 10px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 8px;
  gap: 1px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}
.day-number {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}
.day-info {
  font-size: 9.5px;
  line-height: 1.25;
  white-space: nowrap;
}

.day-full {
  background: rgba(26, 158, 106, 0.08);
  border-color: rgba(26, 158, 106, 0.35);
  color: rgb(var(--on-surface));
}
.day-full:hover {
  background: rgba(26, 158, 106, 0.16);
}

.day-partial {
  background: rgba(250, 189, 50, 0.1);
  border-color: rgba(250, 189, 50, 0.5);
  color: rgb(var(--on-surface));
}
.day-partial:hover {
  background: rgba(250, 189, 50, 0.18);
}

.day-off {
  background: rgba(217, 48, 37, 0.08);
  border-color: rgba(217, 48, 37, 0.35);
  color: rgb(var(--on-surface-variant));
}
.day-off:hover {
  background: rgba(217, 48, 37, 0.16);
}
.day-off .day-number {
  text-decoration: line-through;
  opacity: 0.7;
}

.day-past {
  background: transparent;
  border-color: transparent;
  color: rgb(var(--on-surface-variant));
  opacity: 0.3;
  cursor: not-allowed;
}

.av-input {
  width: 100%;
  background: rgb(var(--surface-container));
  border: 1px solid rgb(var(--outline-variant));
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: rgb(var(--on-surface));
  outline: none;
  transition: border-color 0.15s ease;
  color-scheme: dark;
}
.av-input:focus {
  border-color: rgb(var(--secondary));
}

.state-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid rgb(var(--outline-variant));
  background: rgb(var(--surface-container));
  color: rgb(var(--on-surface-variant));
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.state-btn-on {
  background: rgba(26, 158, 106, 0.15);
  border-color: rgb(var(--status-success));
  color: rgb(var(--status-success));
  font-weight: 600;
}
.state-btn-off {
  background: rgba(217, 48, 37, 0.15);
  border-color: rgb(var(--status-error));
  color: rgb(var(--error));
  font-weight: 600;
}

.remove-btn {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgb(var(--on-surface-variant));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.remove-btn:hover {
  background: rgba(217, 48, 37, 0.15);
  color: rgb(var(--status-error));
}

.add-slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 7px 12px;
  border-radius: 9999px;
  border: 1px dashed rgba(250, 189, 50, 0.5);
  background: transparent;
  color: rgb(var(--secondary));
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.add-slot-btn:hover {
  background: rgba(250, 189, 50, 0.1);
}
</style>
