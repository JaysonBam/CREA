<template>
  <div class="card">
    <div class="flex justify-between items-center mb-3">
      <h2 class="m-0">Ward Statistics</h2>
      <Button label="Back to Wards" icon="pi pi-arrow-left" @click="goBack" />
    </div>

    <div v-if="loading">Loading statistics...</div>

    <div v-else>
      <ul class="list-disc pl-6">
        <li><strong>Open Issues:</strong> {{ stats.open }}</li>
        <li><strong>Closed Issues:</strong> {{ stats.closed }}</li>
        <li><strong>Pending Issues:</strong> {{ stats.pending }}</li>
        <li><strong>Average Resolution Time:</strong> {{ stats.avgResolution }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

function getErr(e) {
  if (e?.response?.data?.message) return e.response.data.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Network or server error';
}


const props = defineProps({
  wardId: {
    type: [String, Number],
    required: true
  }
})

const toast = useToast()
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const stats = ref({
  open: 0,
  closed: 0,
  pending: 0,
  avgResolution: '—'
})

const wardIdNum = computed(() => {
  const raw = props.wardId ?? route.params.id ?? route.query.id
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

function goBack() {
  router.push({ name: 'wards' })
}

function humanizeDuration(input) {
  // accepts seconds, minutes, hours, or a preformatted string
  if (input == null) return '—'
  if (typeof input === 'string' && /day|hour|min|sec/i.test(input)) return input

  let seconds = 0
  if (typeof input === 'number' && Number.isFinite(input)) {
    seconds = input
  } else if (typeof input === 'object') {
    const { seconds: s, minutes: m, hours: h, days: d } = input
    seconds =
      (d ? d * 86400 : 0) +
      (h ? h * 3600 : 0) +
      (m ? m * 60 : 0) +
      (s ? s : 0)
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const days = Math.floor(seconds / 86400)
  seconds %= 86400
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const minutes = Math.floor(seconds / 60)

  if (days) return `${days} day${days === 1 ? '' : 's'}`
  if (hours) return `${hours} hour${hours === 1 ? '' : 's'}`
  if (minutes) return `${minutes} min${minutes === 1 ? '' : 's'}`
  return `${seconds} sec${seconds === 1 ? '' : 's'}`
}

function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') return stats.value
  const open = Number(raw.open ?? raw.openIssues ?? raw.count_open ?? 0)
  const closed = Number(raw.closed ?? raw.closedIssues ?? raw.count_closed ?? 0)
  const pending = Number(raw.pending ?? raw.pendingIssues ?? raw.count_pending ?? 0)

  // Average resolution may arrive as seconds, minutes, hours, or preformatted text
  const avg =
    raw.avgResolution ??
    raw.avg_resolution ??
    raw.average_resolution ??
    raw.avg_seconds ??
    raw.avg_minutes ??
    raw.avg_hours ??
    null

  let avgText = '—'
  if (typeof avg === 'number') {
    // assume seconds
    avgText = humanizeDuration(avg)
  } else if (typeof avg === 'string') {
    avgText = avg
  } else if (typeof avg === 'object' && avg) {
    avgText = humanizeDuration(avg)
  } else if (raw.avg_minutes) {
    avgText = humanizeDuration({ minutes: Number(raw.avg_minutes) })
  } else if (raw.avg_hours) {
    avgText = humanizeDuration({ hours: Number(raw.avg_hours) })
  }

  return {
    open: Number.isFinite(open) ? open : 0,
    closed: Number.isFinite(closed) ? closed : 0,
    pending: Number.isFinite(pending) ? pending : 0,
    avgResolution: avgText
  }
}

onMounted(async () => {
  loading.value = true
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id')
    // Conventional stats endpoint; adjust if your backend uses a different path
    const { data } = await api.get(`/api/wards/${wardIdNum.value}/stats`)
    const payload = data?.data ?? data
    const normalized = normalizeStats(payload)
    // if backend returned seconds for avgResolution, humanize it
    if (typeof payload?.avgResolution === 'number') {
      normalized.avgResolution = humanizeDuration(payload.avgResolution)
    }
    stats.value = normalized
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: getErr(err), life: 4000 })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.card {
  padding: 1.5rem;
}
</style>