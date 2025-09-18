<template>
  <div style="max-width: 600px; margin: 2em auto;">
    <h2>MapPicker Component Test</h2>
    <MapPicker @update:center="onUpdateCenter" />
    <div v-if="coords" style="margin-top: 1em;">
      <strong>Selected Coordinates:</strong>
      <div>Lat: {{ coords.lat }}, Lng: {{ coords.lng }}</div>
      <div style="font-size: 0.9em; color: #888;">Move the map to select a location. The pin is always at the center.</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapPicker from '../components/MapPicker.vue'

const coords = ref(null)
function onUpdateCenter(val) {
  coords.value = val
}
</script>
