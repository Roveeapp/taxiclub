<template>
  <div ref="mapContainer" class="w-full rounded-xl overflow-hidden" :style="{ height: height + 'px' }" />
</template>

<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = withDefaults(defineProps<{
  lat?: number
  lng?: number
  zoom?: number
  height?: number
  markers?: Array<{ lat: number; lng: number; label?: string }>
}>(), {
  lat: 43.3619,
  lng: -5.8594,
  zoom: 12,
  height: 300,
  markers: () => [],
})

const mapContainer = ref<HTMLElement>()
let map: L.Map | null = null

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value).setView([props.lat, props.lng], props.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  if (props.markers.length > 0) {
    props.markers.forEach(marker => {
      L.marker([marker.lat, marker.lng])
        .addTo(map!)
        .bindPopup(marker.label || `${marker.lat}, ${marker.lng}`)
    })
  } else {
    L.marker([props.lat, props.lng])
      .addTo(map!)
      .bindPopup(props.markers[0]?.label || 'Ubicación')
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(() => [props.lat, props.lng], ([lat, lng]) => {
  if (map && lat && lng) {
    map.setView([lat, lng], props.zoom)
  }
})
</script>

<style>
.leaflet-container {
  font-family: 'Inter', sans-serif;
}
</style>
