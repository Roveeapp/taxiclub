<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-on-surface">Mis zonas</h1>
      <p class="text-sm text-on-surface-variant mt-1">
        Define radios desde tu parada y precios fijos para trayectos concretos.
      </p>
    </div>

    <div v-if="stations.length === 0 && !loading" class="card-surface rounded-xl p-8 text-center max-w-2xl">
      <Icon name="tabler:map-off" size="36" class="mx-auto text-white/20 mb-3" />
      <p class="text-sm text-on-surface-variant">No estás afiliado a ninguna parada todavía.</p>
    </div>

    <div v-else class="space-y-6 w-full max-w-[1400px]">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Mapa -->
        <div class="card-surface rounded-xl p-4 border border-outline-variant">
          <div class="mb-3">
            <label class="field-label block mb-1.5">Parada</label>
            <select v-model="selectedStationId" class="zone-input">
              <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <ClientOnly>
            <div ref="mapEl" class="w-full h-[380px] rounded-xl overflow-hidden" />
            <template #fallback>
              <div class="w-full h-[380px] rounded-xl bg-surface-container flex items-center justify-center">
                <Icon name="tabler:loader" size="22" class="animate-spin text-brand-gold" />
              </div>
            </template>
          </ClientOnly>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full border-2 border-red-500 bg-red-500/20" />
              <span class="text-xs text-on-surface-variant">No acepto reservas</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/20" />
              <span class="text-xs text-on-surface-variant">Precio fijo</span>
            </div>
          </div>
        </div>

        <!-- Anillos -->
        <div class="space-y-6">
          <!-- Nuevo anillo -->
          <div class="card-surface rounded-xl p-5 border border-outline-variant">
            <h2 class="text-base font-medium text-on-surface mb-4">Añadir anillo</h2>

            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="field-label block mb-1.5">Desde (km)</label>
                <input v-model="form.fromKm" type="number" min="0" step="0.5" class="zone-input">
              </div>
              <div>
                <label class="field-label block mb-1.5">Hasta (km)</label>
                <input v-model="form.toKm" type="number" min="0.5" step="0.5" class="zone-input">
              </div>
            </div>

            <div class="flex gap-2 mb-4">
              <button
                type="button"
                class="mode-btn flex-1"
                :class="{ 'mode-btn-exclude': form.mode === 'exclude' }"
                @click="form.mode = 'exclude'"
              >
                <Icon name="tabler:ban" size="15" /> No acepto reservas
              </button>
              <button
                type="button"
                class="mode-btn flex-1"
                :class="{ 'mode-btn-fixed': form.mode === 'fixed_price' }"
                @click="form.mode = 'fixed_price'"
              >
                <Icon name="tabler:currency-euro" size="15" /> Precio fijo
              </button>
            </div>

            <div v-if="form.mode === 'fixed_price'" class="mb-4">
              <label class="field-label block mb-1.5">Precio fijo (€)</label>
              <input v-model="form.fixedPrice" type="number" min="1" step="0.5" placeholder="Ej: 17" class="zone-input max-w-[160px]">
            </div>

            <div class="flex items-center gap-3">
              <AppButton :loading="saving" :disabled="!canAdd" @click="addZone">
                <Icon name="tabler:plus" size="15" class="mr-1" />
                Añadir anillo
              </AppButton>
              <span v-if="formError" class="text-xs text-error">{{ formError }}</span>
            </div>
          </div>

          <!-- Lista -->
          <div class="card-surface rounded-xl border border-outline-variant overflow-hidden">
            <div class="px-5 py-4 border-b border-outline-variant">
              <h2 class="text-base font-medium text-on-surface">Anillos de {{ selectedStationName }}</h2>
            </div>
            <div v-if="stationZones.length > 0" class="divide-y divide-outline-variant">
              <div v-for="z in stationZones" :key="z.id" class="flex items-center gap-3 px-5 py-3">
                <div
                  class="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                  :class="z.mode === 'exclude' ? 'border-red-500 bg-red-500/20' : 'border-amber-400 bg-amber-400/20'"
                />
                <div class="flex-1">
                  <p class="text-sm text-on-surface font-medium">
                    {{ Number(z.radius_from_km) }}–{{ Number(z.radius_to_km) }} km
                    <span v-if="z.mode === 'fixed_price'" class="text-brand-gold"> · {{ Number(z.fixed_price).toFixed(2) }} €</span>
                  </p>
                  <p class="text-[11px] text-on-surface-variant">
                    {{ z.mode === 'exclude' ? 'No aceptas reservas con destino en este anillo' : 'Precio fijo para destinos en este anillo' }}
                  </p>
                </div>
                <button class="remove-btn" aria-label="Eliminar anillo" @click="removeZone(z)">
                  <Icon name="tabler:trash" size="15" />
                </button>
              </div>
            </div>
            <p v-else class="px-5 py-6 text-sm text-on-surface-variant text-center">
              Sin anillos en esta parada — aceptas cualquier destino a la tarifa normal.
            </p>
          </div>
        </div>
      </div>

      <!-- ── Precios fijos de trayecto ── -->
      <div class="card-surface rounded-xl border border-outline-variant overflow-hidden">
        <div class="px-5 py-4 border-b border-outline-variant">
          <h2 class="text-base font-medium text-on-surface flex items-center gap-2">
            <Icon name="tabler:route" size="18" class="text-emerald-400" />
            Precios fijos de trayecto
          </h2>
          <p class="text-[11px] text-on-surface-variant mt-0.5">
            Prevalecen sobre anillos y tarifa por km.
          </p>
        </div>

        <!-- Formulario -->
        <div class="px-5 py-4 border-b border-outline-variant bg-surface-container/40">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="field-label block mb-1.5">Origen</label>
              <div class="route-ac-wrap">
                <Icon name="tabler:map-pin-2" size="16" class="route-ac-icon" />
                <AutoComplete
                  v-model="routeOriginQuery"
                  :suggestions="routeOriginSuggestions"
                  option-label="description"
                  placeholder="Ej: Aeropuerto de Asturias"
                  class="w-full"
                  append-to="self"
                  @complete="onRouteOriginSearch"
                  @item-select="selectRouteOrigin"
                >
                  <template #option="{ option }">
                    <div class="flex items-center gap-2">
                      <Icon :name="option.source === 'station' ? 'tabler:map-pin-2' : 'tabler:map-pin'" size="16" class="text-brand-gold flex-shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ option.label }}</p>
                        <p class="text-[11px] opacity-60 truncate">{{ option.description }}</p>
                      </div>
                      <span v-if="option.source === 'station'" class="text-[9px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded-full font-medium">Parada</span>
                    </div>
                  </template>
                </AutoComplete>
              </div>
            </div>
            <div>
              <label class="field-label block mb-1.5">Destino</label>
              <div class="route-ac-wrap">
                <Icon name="tabler:map-pin" size="16" class="route-ac-icon" />
                <AutoComplete
                  v-model="routeDestQuery"
                  :suggestions="routeDestSuggestions"
                  option-label="description"
                  placeholder="Ej: Oviedo"
                  class="w-full"
                  append-to="self"
                  @complete="onRouteDestSearch"
                  @item-select="selectRouteDest"
                >
                  <template #option="{ option }">
                    <div class="flex items-center gap-2">
                      <Icon :name="option.source === 'station' ? 'tabler:map-pin-2' : 'tabler:map-pin'" size="16" class="text-brand-gold flex-shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ option.label }}</p>
                        <p class="text-[11px] opacity-60 truncate">{{ option.description }}</p>
                      </div>
                      <span v-if="option.source === 'station'" class="text-[9px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded-full font-medium">Parada</span>
                    </div>
                  </template>
                </AutoComplete>
              </div>
            </div>
            <div>
              <label class="field-label block mb-1.5">Precio (€)</label>
              <input v-model="routeForm.price" type="number" min="1" step="0.5" placeholder="Ej: 50" class="zone-input">
            </div>
          </div>
          <div class="flex items-center gap-3">
            <AppButton :loading="savingRoute" :disabled="!canAddRoute" @click="addRoute">
              <Icon name="tabler:plus" size="15" class="mr-1" />
              Añadir trayecto
            </AppButton>
            <span v-if="routeError" class="text-xs text-error">{{ routeError }}</span>
          </div>
        </div>

        <!-- Lista -->
        <div v-if="fixedRoutes.length > 0" class="divide-y divide-outline-variant">
          <div v-for="r in fixedRoutes" :key="r.id" class="flex items-center gap-3 px-5 py-3">
            <div class="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 bg-emerald-400/20 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-on-surface font-medium truncate">
                {{ r.origin_label }} → {{ r.dest_label }}
                <span class="text-brand-gold"> · {{ Number(r.price).toFixed(2) }} €</span>
              </p>
            </div>
            <button class="remove-btn" aria-label="Eliminar trayecto" @click="removeRoute(r)">
              <Icon name="tabler:trash" size="15" />
            </button>
          </div>
        </div>
        <p v-else class="px-5 py-6 text-sm text-on-surface-variant text-center">
          Sin trayectos fijos — se usará la tarifa por km o los anillos definidos.
        </p>
      </div>
    </div>

    <AppToast ref="toastRef" :message="toastMessage" :type="toastType" />
  </div>
</template>

<script setup lang="ts">
import AutoComplete from 'primevue/autocomplete'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const loading = ref(true)
const stations = ref<any[]>([])
const allStations = ref<any[]>([])
const zones = ref<any[]>([])
const fixedRoutes = ref<any[]>([])
const selectedStationId = ref('')
const saving = ref(false)
const savingRoute = ref(false)
const formError = ref('')
const routeError = ref('')

const toastRef = ref<{ show: () => void } | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const form = reactive({
  fromKm: '0',
  toKm: '10',
  mode: 'exclude' as 'exclude' | 'fixed_price',
  fixedPrice: '',
})

const routeForm = reactive({
  price: '',
})

// Autocomplete para origen y destino de rutas fijas
interface RouteSuggestion { id: string; label: string; description: string; source: string; lat?: number; lng?: number; stationId?: string }
const routeOriginQuery = ref<string | RouteSuggestion>('')
const routeDestQuery = ref<string | RouteSuggestion>('')
const routeOriginSuggestions = ref<RouteSuggestion[]>([])
const routeDestSuggestions = ref<RouteSuggestion[]>([])
const selectedOrigin = ref<RouteSuggestion | null>(null)
const selectedDest = ref<RouteSuggestion | null>(null)
let originDebounce: ReturnType<typeof setTimeout> | null = null
let destDebounce: ReturnType<typeof setTimeout> | null = null

const effectiveOriginLabel = computed(() => {
  const q = routeOriginQuery.value
  if (typeof q === 'string') return q.trim()
  return (q?.label || q?.description || '').trim()
})
const effectiveDestLabel = computed(() => {
  const q = routeDestQuery.value
  if (typeof q === 'string') return q.trim()
  return (q?.label || q?.description || '').trim()
})

function buildStationSuggestions(query: string): RouteSuggestion[] {
  const q = query.toLowerCase()
  return allStations.value
    .filter((s: any) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
    .slice(0, 5)
    .map((s: any) => ({
      id: s.id,
      label: s.name,
      description: `${s.name}, ${s.city}`,
      source: 'station',
      lat: Number(s.lat),
      lng: Number(s.lng),
      stationId: s.id,
    }))
}

async function searchAddresses(query: string): Promise<RouteSuggestion[]> {
  if (query.length < 3) return []
  try {
    const data = await $fetch(`/api/addresses/search?q=${encodeURIComponent(query)}`) as any[]
    return (data || []).map(r => ({
      id: r.id,
      label: r.label,
      description: r.description,
      source: r.source || 'osm',
      lat: r.lat,
      lng: r.lng,
    }))
  } catch { return [] }
}

function onRouteOriginSearch(event: { query: string }) {
  if (originDebounce) clearTimeout(originDebounce)
  originDebounce = setTimeout(async () => {
    const stationMatches = buildStationSuggestions(event.query)
    const addressMatches = await searchAddresses(event.query)
    routeOriginSuggestions.value = [...stationMatches, ...addressMatches].slice(0, 8)
  }, 300)
}

function onRouteDestSearch(event: { query: string }) {
  if (destDebounce) clearTimeout(destDebounce)
  destDebounce = setTimeout(async () => {
    const stationMatches = buildStationSuggestions(event.query)
    const addressMatches = await searchAddresses(event.query)
    routeDestSuggestions.value = [...stationMatches, ...addressMatches].slice(0, 8)
  }, 300)
}

function selectRouteOrigin(event: { value: RouteSuggestion }) {
  selectedOrigin.value = event.value
  routeOriginQuery.value = event.value.label
  routeOriginSuggestions.value = []
}

function selectRouteDest(event: { value: RouteSuggestion }) {
  selectedDest.value = event.value
  routeDestQuery.value = event.value.label
  routeDestSuggestions.value = []
}

// Limpiar selección si el usuario edita el texto manualmente
watch(routeOriginQuery, (q) => {
  if (typeof q === 'string' && selectedOrigin.value && q !== selectedOrigin.value.label) {
    selectedOrigin.value = null
  }
})
watch(routeDestQuery, (q) => {
  if (typeof q === 'string' && selectedDest.value && q !== selectedDest.value.label) {
    selectedDest.value = null
  }
})

const canAddRoute = computed(() => {
  return !!effectiveOriginLabel.value
    && !!effectiveDestLabel.value
    && effectiveOriginLabel.value !== effectiveDestLabel.value
    && !!routeForm.price
    && Number(routeForm.price) > 0
})

const selectedStation = computed(() => stations.value.find((s: any) => s.id === selectedStationId.value))
const selectedStationName = computed(() => selectedStation.value?.name || 'la parada')
const stationZones = computed(() =>
  zones.value
    .filter((z: any) => z.station_id === selectedStationId.value)
    .sort((a: any, b: any) => Number(a.radius_from_km) - Number(b.radius_from_km)),
)

const canAdd = computed(() => {
  const from = Number(form.fromKm)
  const to = Number(form.toKm)
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return false
  if (form.mode === 'fixed_price' && (!form.fixedPrice || Number(form.fixedPrice) <= 0)) return false
  return !!selectedStationId.value
})

// ── Mapa (Leaflet, solo cliente) ───────────────────────
const mapEl = ref<HTMLElement | null>(null)
let L: any = null
let map: any = null
let circleLayers: any[] = []

async function initMap() {
  if (!mapEl.value || map) return
  const mod = await import('leaflet')
  // @ts-expect-error css import
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(mapEl.value).setView([43.3619, -5.8594], 10)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
  drawZones()
}

function drawZones() {
  if (!map || !L) return
  for (const layer of circleLayers) map.removeLayer(layer)
  circleLayers = []

  const s = selectedStation.value
  if (!s?.lat || !s?.lng) return
  const center: [number, number] = [Number(s.lat), Number(s.lng)]

  const marker = L.marker(center).addTo(map).bindPopup(s.name)
  circleLayers.push(marker)

  // Dibujar de mayor a menor para que los anillos pequeños queden encima
  const sorted = [...stationZones.value].sort((a: any, b: any) => Number(b.radius_to_km) - Number(a.radius_to_km))
  let maxRadius = 5000
  for (const z of sorted) {
    const isExclude = z.mode === 'exclude'
    const color = isExclude ? '#ef4444' : '#fabd32'
    const outer = L.circle(center, {
      radius: Number(z.radius_to_km) * 1000,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.1,
    }).addTo(map)
    outer.bindTooltip(
      isExclude
        ? `${z.radius_from_km}–${z.radius_to_km} km · sin reservas`
        : `${z.radius_from_km}–${z.radius_to_km} km · ${Number(z.fixed_price).toFixed(2)} €`,
      { sticky: true },
    )
    circleLayers.push(outer)
    if (Number(z.radius_from_km) > 0) {
      const inner = L.circle(center, {
        radius: Number(z.radius_from_km) * 1000,
        color,
        weight: 1,
        dashArray: '4 4',
        fill: false,
      }).addTo(map)
      circleLayers.push(inner)
    }
    maxRadius = Math.max(maxRadius, Number(z.radius_to_km) * 1000)
  }

  map.setView(center, radiusToZoom(maxRadius))
}

function radiusToZoom(radiusM: number) {
  if (radiusM <= 6000) return 11
  if (radiusM <= 12000) return 10
  if (radiusM <= 25000) return 9
  if (radiusM <= 50000) return 8
  return 7
}

watch([selectedStationId, zones], () => drawZones(), { deep: true })

// ── Datos ──────────────────────────────────────────────
async function loadAll() {
  try {
    const [stationsData, zonesData, routesData, allStationsData] = await Promise.all([
      $fetch('/api/taxista/paradas'),
      $fetch('/api/taxista/zonas'),
      $fetch('/api/taxista/rutas').catch(() => []),
      $fetch('/api/paradas').catch(() => []),
    ])
    stations.value = (stationsData as any[]).filter(s => s.lat && s.lng)
    zones.value = zonesData as any[]
    fixedRoutes.value = routesData as any[]
    allStations.value = allStationsData as any[]
    if (!selectedStationId.value && stations.value.length > 0) {
      selectedStationId.value = stations.value[0].id
    }
  } catch (e) {
    console.error('Error loading zones:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadAll()
  await nextTick()
  initMap()
})

function notify(type: 'success' | 'error', message: string) {
  toastType.value = type
  toastMessage.value = message
  toastRef.value?.show()
}

async function addZone() {
  formError.value = ''
  saving.value = true
  try {
    await $fetch('/api/taxista/zonas', {
      method: 'POST',
      body: {
        stationId: selectedStationId.value,
        fromKm: Number(form.fromKm),
        toKm: Number(form.toKm),
        mode: form.mode,
        fixedPrice: form.mode === 'fixed_price' ? Number(form.fixedPrice) : null,
      },
    })
    // Sugerir el siguiente anillo a continuación del creado
    form.fromKm = String(form.toKm)
    form.toKm = String(Number(form.toKm) + 10)
    await loadAll()
    notify('success', 'Anillo añadido')
  } catch (e: any) {
    formError.value = e?.data?.message || 'No se pudo añadir'
  } finally {
    saving.value = false
  }
}

async function removeZone(z: any) {
  try {
    await $fetch(`/api/taxista/zonas/${z.id}`, { method: 'DELETE' })
    await loadAll()
  } catch (e: any) {
    notify('error', e?.data?.message || 'No se pudo eliminar')
  }
}

// ── Rutas fijas ────────────────────────────────────────
async function addRoute() {
  routeError.value = ''
  savingRoute.value = true
  try {
    await $fetch('/api/taxista/rutas', {
      method: 'POST',
      body: {
        originLabel: effectiveOriginLabel.value,
        destLabel: effectiveDestLabel.value,
        originStationId: selectedOrigin.value?.stationId || null,
        originLat: selectedOrigin.value?.lat || null,
        originLng: selectedOrigin.value?.lng || null,
        destStationId: selectedDest.value?.stationId || null,
        destLat: selectedDest.value?.lat || null,
        destLng: selectedDest.value?.lng || null,
        price: Number(routeForm.price),
      },
    })
    routeForm.price = ''
    routeDestQuery.value = ''
    selectedDest.value = null
    await loadAll()
    notify('success', 'Trayecto añadido')
  } catch (e: any) {
    routeError.value = e?.data?.message || 'No se pudo añadir'
  } finally {
    savingRoute.value = false
  }
}

async function removeRoute(r: any) {
  try {
    await $fetch(`/api/taxista/rutas/${r.id}`, { method: 'DELETE' })
    await loadAll()
    notify('success', 'Trayecto eliminado')
  } catch (e: any) {
    notify('error', e?.data?.message || 'No se pudo eliminar')
  }
}
</script>

<style scoped>
.zone-input {
  width: 100%;
  background: var(--surface-container);
  border: 1px solid var(--outline-variant);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 14px;
  color: var(--on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}
.zone-input:focus {
  border-color: var(--secondary);
}
.zone-input option {
  background: var(--surface-container-low);
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--outline-variant);
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.mode-btn-exclude {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ff8a80;
  font-weight: 600;
}
.mode-btn-fixed {
  background: rgba(250, 189, 50, 0.15);
  border-color: var(--secondary);
  color: var(--secondary);
  font-weight: 600;
}

.remove-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}
.remove-btn:hover {
  background: rgba(217, 48, 37, 0.15);
  color: var(--status-error);
}

/* AutoComplete de rutas fijas (tema oscuro) */
.route-ac-wrap {
  position: relative;
}
.route-ac-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: var(--secondary);
  pointer-events: none;
}
:deep(.route-ac-wrap .p-autocomplete) {
  border: 1px solid var(--outline-variant) !important;
  border-radius: 10px !important;
  background: var(--surface-container) !important;
  padding: 0 !important;
  min-height: 38px !important;
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}
:deep(.route-ac-wrap .p-autocomplete-input) {
  padding: 8px 12px 8px 34px !important;
  width: 100% !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  color: var(--on-surface) !important;
  min-height: 36px !important;
}
:deep(.route-ac-wrap .p-autocomplete-input::placeholder) {
  color: var(--on-surface-variant) !important;
  opacity: 0.5 !important;
}
:deep(.route-ac-wrap .p-autocomplete:focus-within) {
  border-color: var(--secondary) !important;
}
:deep(.route-ac-wrap .p-autocomplete-overlay) {
  border: 1px solid var(--outline-variant) !important;
  border-radius: 10px !important;
  background: var(--surface-container-low) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
  margin-top: 4px !important;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
}
:deep(.route-ac-wrap .p-autocomplete-option) {
  padding: 8px 12px !important;
  color: var(--on-surface) !important;
  cursor: pointer !important;
  border-radius: 0 !important;
  margin: 0 !important;
}
:deep(.route-ac-wrap .p-autocomplete-option:hover),
:deep(.route-ac-wrap .p-autocomplete-option-selected) {
  background: var(--surface-container) !important;
}
</style>
