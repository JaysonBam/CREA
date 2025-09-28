<template>
  <div class="card">
    <div class="flex justify-between items-center mb-3">
      <h2 class="m-0">Ward Statistics</h2>
      <div class="flex gap-2">
        <Button label="Refresh" icon="pi pi-refresh" @click="fetchStats" outlined />
        <Button label="Back to Wards" icon="pi pi-arrow-left" @click="goBack" />
      </div>
    </div>

    <div v-if="loading">Loading statistics...</div>

    <div v-else>
      <ul class="list-disc pl-6">
        <li><strong>Open (NEW):</strong> {{ stats.open }}</li>
        <li><strong>Resolved:</strong> {{ stats.closed }}</li>
        <li><strong>Pending (ACK + IN&nbsp;PROGRESS):</strong> {{ stats.pending }}</li>
        <li><strong>Average Resolution (ACK → RESOLVED):</strong> {{ (typeof stats.avgResolution === 'number' || stats.avgResolution === 0) ? stats.avgResolution : '—' /* shows "—" when null/undefined/NaN */ }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '@/utils/api'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'

const toNum = (v) => (typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN));
const isFiniteNum = (v) => Number.isFinite(toNum(v));

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
  avgResolution: null
})

const wardIdNum = computed(() => {
  const raw = props.wardId ?? route.params.id ?? route.query.id
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})

function goBack() {
  router.push({ name: 'wards' })
}

function normalizeStats(raw) {
  const safeNum = (v) => {
    if (v === 0 || v === "0") return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const open = Number(raw?.open ?? raw?.openIssues ?? raw?.count_open ?? 0) || 0;
  const closed = Number(raw?.closed ?? raw?.closedIssues ?? raw?.count_closed ?? 0) || 0;
  const pending = Number(raw?.pending ?? raw?.pendingIssues ?? raw?.count_pending ?? 0) || 0;

  // Prefer a raw numeric seconds value if present; otherwise keep null
  const avgResolution =
    safeNum(raw?.avgResolution) ??
    safeNum(raw?.avg_resolution) ??
    safeNum(raw?.average_resolution) ??
    safeNum(raw?.avg_seconds) ??
    null;

  return { open, closed, pending, avgResolution };
}

async function fetchStats() {
  loading.value = true
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id');

    // 1) Fetch aggregate stats
    const r1 = await api.get(`/api/wards/${wardIdNum.value}/stats`);
    const payload = r1?.data?.data ?? r1?.data ?? r1 ?? {};
    const normalized = normalizeStats(payload);

    // 2) Try the dedicated ACK→RES average endpoint; accept 0 as valid
    try {
      const r2 = await api.get(`/api/wards/${wardIdNum.value}/stats/avg-resolution-time`);
      const d2 = r2?.data?.data ?? r2?.data ?? {};
      const candidate =
        d2?.avgResolutionSeconds ??
        d2?.avg_seconds ??
        (typeof d2 === 'number' ? d2 : null);

      const n = Number(candidate);
      if (Number.isFinite(n) || candidate === 0) {
        normalized.avgResolution = candidate === 0 ? 0 : n;
      }
    } catch (_) {
      // keep whatever /stats gave us (may be null)
    }

    stats.value = normalized;
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: getErr(err), life: 4000 });
  } finally {
    loading.value = false
  }
}

let refreshTimer = null;
let visibilityHandler = null;

onMounted(() => {
  fetchStats();

  // Auto-refresh every 30s while on this page
  refreshTimer = setInterval(fetchStats, 30000);

  // Refresh when tab becomes visible again (e.g., user returns after resolving an issue)
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      fetchStats();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
});
</script>

<style scoped>
.card {
  padding: 1.5rem;
}
</style>