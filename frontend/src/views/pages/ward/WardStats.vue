<template>
  <div class="card">
    <div class="flex justify-between items-center mb-3">
      <h2 class="m-0">Ward Statistics</h2>
      <div class="flex gap-2">
        <Dropdown
          v-model="refreshInterval"
          :options="refreshOptions"
          optionLabel="label"
          optionValue="value"
          class="w-12rem"
        />
        <Button label="Export CSV" icon="pi pi-download" @click="exportCsv" outlined />
        <Button label="Refresh" icon="pi pi-refresh" @click="fetchStats" outlined />
        <Button label="Back to Wards" icon="pi pi-arrow-left" @click="goBack" />
      </div>
    </div>

    <div v-if="loading">Loading statistics...</div>

    <div v-else>
      <!-- KPI cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-3">
          <div class="kpi">
            <div class="kpi-title">Open (NEW)</div>
            <div class="kpi-value">{{ stats.open }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi">
            <div class="kpi-title">Pending (ACK + IN&nbsp;PROGRESS)</div>
            <div class="kpi-value">{{ stats.pending }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi">
            <div class="kpi-title">Resolved</div>
            <div class="kpi-value">{{ stats.closed }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi">
            <div class="kpi-title">Avg Resolution (ACK → RES)</div>
            <div class="kpi-value">
              {{ formattedAvgResolution }}
            </div>
          </div>
        </div>
      </div>

      <!-- Status breakdown donut -->
      <div class="grid">
        <div class="col-12 lg:col-6">
          <div class="card-inner">
            <h3 class="m-0 mb-3 text-lg">Status Breakdown</h3>
            <Chart type="doughnut" :data="statusChartData" :options="chartOptions" />
          </div>
        </div>
        <div class="col-12 lg:col-6">
          <div class="card-inner">
            <div class="flex justify-between items-center mb-3">
              <h3 class="m-0 text-lg">Trend (New vs Resolved vs Open)</h3>
              <Dropdown v-model="seriesDays" :options="seriesDayOptions" optionLabel="label" optionValue="value" class="w-10rem" />
            </div>
            <Chart type="line" :data="seriesChartData" :options="lineChartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import api from '@/utils/api'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Chart from 'primevue/chart'
import Dropdown from 'primevue/dropdown'

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
  avgResolution: null,
  breakdown: { new: 0, acknowledged: 0, in_progress: 0, resolved: 0 },
})

const refreshOptions = [
  { label: 'Auto: 30s', value: 30000 },
  { label: 'Auto: 60s', value: 60000 },
  { label: 'Auto: 2 min', value: 120000 },
  { label: 'Auto: Off', value: 0 },
];
const refreshInterval = ref(30000);

const seriesDayOptions = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
];
const seriesDays = ref(7);
const seriesData = ref([]);

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

  const breakdown = {
    new: Number(raw?.breakdown?.new ?? 0) || 0,
    acknowledged: Number(raw?.breakdown?.acknowledged ?? 0) || 0,
    in_progress: Number(raw?.breakdown?.in_progress ?? 0) || 0,
    resolved: Number(raw?.breakdown?.resolved ?? 0) || 0,
  };

  return { open, closed, pending, avgResolution, breakdown };
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

async function fetchSeries() {
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id');
    const r = await api.get(`/api/wards/${wardIdNum.value}/stats/series?days=${seriesDays.value}`);
    const payload = r?.data?.data ?? {};
    seriesData.value = payload.series || [];
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Series load failed', detail: getErr(err), life: 4000 });
  }
}

const seriesChartData = computed(() => {
  const labels = seriesData.value.map(p => p.date);
  return {
    labels,
    datasets: [
      {
        label: 'New',
        borderColor: '#42A5F5',
        fill: false,
        data: seriesData.value.map(p => p.new),
      },
      {
        label: 'Resolved',
        borderColor: '#66BB6A',
        fill: false,
        data: seriesData.value.map(p => p.resolved),
      },
      {
        label: 'Open',
        borderColor: '#FFA726',
        fill: false,
        data: seriesData.value.map(p => p.open),
      },
    ],
  };
});

const lineChartOptions = {
  plugins: {
    legend: { position: 'bottom' },
  },
  responsive: true,
  maintainAspectRatio: false,
};

const formattedAvgResolution = computed(() => {
  return (typeof stats.value.avgResolution === 'number' || stats.value.avgResolution === 0)
    ? formatSeconds(stats.value.avgResolution)
    : '—';
});

const statusChartData = computed(() => {
  const b = stats.value.breakdown || {};
  return {
    labels: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'],
    datasets: [
      {
        data: [b.new || 0, b.acknowledged || 0, b.in_progress || 0, b.resolved || 0],
        backgroundColor: ['#42A5F5', '#FFB300', '#AB47BC', '#66BB6A'],
      },
    ],
  };
});

const chartOptions = {
  plugins: {
    legend: { position: 'bottom' },
  },
  maintainAspectRatio: false,
};

function exportCsv() {
  const b = stats.value.breakdown || {};
  const rows = [
    ['Metric', 'Value'],
    ['Open (NEW)', stats.value.open],
    ['Pending (ACK + IN_PROGRESS)', stats.value.pending],
    ['Resolved', stats.value.closed],
    ['Avg Resolution (ACK→RESOLVED) [HH:MM:SS]', formattedAvgResolution.value],
    [],
    ['Status', 'Count'],
    ['NEW', b.new || 0],
    ['ACKNOWLEDGED', b.acknowledged || 0],
    ['IN_PROGRESS', b.in_progress || 0],
    ['RESOLVED', b.resolved || 0],
  ];
  const csv = rows.map(r => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ward-${wardIdNum.value || 'stats'}-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let refreshTimer = null;
let visibilityHandler = null;

function setupAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (refreshInterval.value > 0) {
    refreshTimer = setInterval(fetchStats, refreshInterval.value);
  }
}

onMounted(() => {
  fetchStats();
  fetchSeries();
  setupAutoRefresh();

  // Refresh when tab becomes visible again
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      fetchStats();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
});

watch(refreshInterval, () => {
  setupAutoRefresh();
});

watch(seriesDays, () => {
  fetchSeries();
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
});

function formatSeconds(total) {
  const s = Math.floor(Number(total) || 0);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
</script>

<style scoped>
.card {
  padding: 1.5rem;
}
.kpi {
  background: var(--surface-100);
  border-radius: 8px;
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kpi-title {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.25rem;
}
.kpi-value {
  font-size: 1.5rem;
  font-weight: 600;
}
.card-inner {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1rem;
  height: 100%;
}
</style>