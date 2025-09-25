<template>
  <div class="card">
    <div class="flex justify-between items-center mb-3">
      <h2 class="m-0">Ward Profile</h2>
      <Button label="Back to Wards" icon="pi pi-arrow-left" @click="goBack" />
    </div>

    <div v-if="loading">Loading ward details...</div>

    <div v-else>
      <p class="mb-2"><strong>Name:</strong> {{ ward.name || 'Unknown' }}</p>
      <p class="mb-2"><strong>Leader:</strong> {{ ward.leaderName || 'Unassigned' }}</p>

      <div class="mt-3">
        <p class="mb-2"><strong>Staff ({{ ward.staffCount ?? 0 }})</strong></p>
      </div>

      <div class="mt-3" v-if="ward.issuesSummary">
        <p class="mb-2"><strong>Issues Summary:</strong> {{ ward.issuesSummary }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import { useToast } from 'primevue/usetoast'
import * as wardHelper from '@/utils/ward_helper'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push({ name: 'wards' })
}

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
const ward = ref({ staff: [] })
const loading = ref(true)

const wardIdNum = computed(() => {
  const raw = props.wardId ?? route.params.id ?? route.query.id
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

function normalize(row) {
  return {
    id: row.id,
    name: row.name,
    leaderName: row.leaderName,
    staffCount: row.staffCount
  }
}

async function loadWardById(id) {
  // Prefer helper functions if present so we use the app's canonical endpoints
  if (typeof wardHelper.getWardById === 'function') {
    const resp = await wardHelper.getWardById(id)
    return resp?.data ?? resp
  }
  if (typeof wardHelper.getWard === 'function') {
    const resp = await wardHelper.getWard(id)
    return resp?.data ?? resp
  }
  if (typeof wardHelper.fetchWard === 'function') {
    const resp = await wardHelper.fetchWard(id)
    return resp?.data ?? resp
  }
  // Fallback direct axios
  const { data } = await api.get(`/api/wards/${id}`)
  return data?.data || data
}

onMounted(async () => {
  loading.value = true
  try {
    if (!wardIdNum.value) {
      throw new Error('Invalid ward id')
    }
    const raw = await loadWardById(wardIdNum.value)
    ward.value = normalize(raw || {})
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: getErr(err), life: 4000 })
    ward.value = { staff: [] }
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