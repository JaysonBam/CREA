<template>
  <div>
    <l-map
      v-if="center"
      :zoom="zoom"
      :center="center"
      style="height: 400px; width: 100%;"
      @move="onMapMove"
    >
      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <l-marker :lat-lng="center" />
    </l-map>
    <div v-else-if="locationNotFound" style="margin-top: 1em; color: #b00;">
      <strong>Location not found</strong>
      <div style="font-size: 0.9em; color: #888;">Unable to retrieve your device location. Check location permissions and try again.</div>
    </div>
    <div v-else style="margin-top: 1em;">Loading map... (waiting for device location)</div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits } from 'vue'
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Patch Leaflet marker icon globally
if (L.Icon && L.Icon.Default) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow
  })
}

const center = ref(null)
const emit = defineEmits(['update:center'])
const zoom = ref(16)
const locationNotFound = ref(false)

function onMapMove(e) {
  const { lat, lng } = e.target.getCenter()
  center.value = { lat, lng }
  emit('update:center', { lat, lng })
}

onMounted(async () => {
  center.value = null
  locationNotFound.value = false

  if (!navigator.geolocation) {
    locationNotFound.value = true
    return
  }
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (status.state === 'denied') {
        locationNotFound.value = true
        return
      }
    }
  } catch {}

  let finished = false
  const geoOptions = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      finished = true
  center.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
  emit('update:center', { lat: pos.coords.latitude, lng: pos.coords.longitude })
    },
    () => {
      finished = true
      locationNotFound.value = true
    },
    geoOptions
  )
  setTimeout(() => {
    if (!finished && !center.value) locationNotFound.value = true
  }, 7000)
})
</script>