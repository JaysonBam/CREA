<template>
  <div class="stats-page">
    <!-- Hero / Header -->
    <div class="hero">
      <div class="hero-left">
        <i class="pi pi-chart-bar hero-icon" />
        <div>
          <h2 class="m-0">Ward Statistics</h2>
          <div class="hero-sub">
            <span class="badge">
              <i class="pi pi-clock mr-1" />
              <span>Updated {{ lastUpdatedText }}</span>
            </span>
            <span v-if="refreshInterval > 0" class="dot-pulse ml-2" title="Auto refresh on"></span>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <Dropdown
          v-model="refreshInterval"
          :options="refreshOptions"
          optionLabel="label"
          optionValue="value"
          class="w-12rem"
        />
        <Dropdown
          v-model="seriesDays"
          :options="seriesDayOptions"
          optionLabel="label"
          optionValue="value"
          class="w-10rem hidden lg:block"
        />
        <Button label="Export CSV" icon="pi pi-download" @click="exportCsv" outlined />
        <Button label="Refresh" icon="pi pi-refresh" @click="doManualRefresh" outlined />
        <Button label="Back to Wards" icon="pi pi-arrow-left" @click="goBack" />
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton-grid">
      <div class="skeleton-card" v-for="n in 4" :key="'kpi-skel-'+n"></div>
      <div class="skeleton-panel" />
      <div class="skeleton-panel" />
    </div>

    <div v-else>
      <!-- KPI cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-3">
          <div class="kpi kpi--blue">
            <div class="kpi-head">
              <i class="pi pi-exclamation-circle kpi-icon" />
              <div class="kpi-title">Open (NEW)</div>
            </div>
            <div class="kpi-value">{{ stats.open }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi kpi--amber">
            <div class="kpi-head">
              <i class="pi pi-hourglass kpi-icon" />
              <div class="kpi-title">Pending (ACK + IN&nbsp;PROGRESS)</div>
            </div>
            <div class="kpi-value">{{ stats.pending }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi kpi--green">
            <div class="kpi-head">
              <i class="pi pi-check-circle kpi-icon" />
              <div class="kpi-title">Resolved</div>
            </div>
            <div class="kpi-value">{{ stats.closed }}</div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="kpi kpi--violet">
            <div class="kpi-head">
              <i class="pi pi-clock kpi-icon" />
              <div class="kpi-title">Avg Resolution (ACK → RES)</div>
            </div>
            <div class="kpi-value">
              {{ formattedAvgResolution }}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid">
        <div class="col-12 lg:col-6">
          <div class="panel">
            <div class="panel-head">
              <h3 class="m-0 text-lg">Status Breakdown</h3>
              <span class="panel-note">Distribution of all issues</span>
            </div>
            <Chart type="doughnut" :data="statusChartData" :options="doughnutOptions" />
          </div>
        </div>

        <div class="col-12 lg:col-6">
          <div class="panel">
            <div class="panel-head">
              <h3 class="m-0 text-lg">Trend (New vs Resolved vs Open)</h3>
              <Dropdown v-model="seriesDays" :options="seriesDayOptions" optionLabel="label" optionValue="value" class="w-10rem lg:hidden" />
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
const lastUpdated = ref(null)

const stats = ref({
  open: 0,
  closed: 0,
  pending: 0,
  avgResolution: null,
  breakdown: { new: 0, acknowledged: 0, in_progress: 0, resolved: 0 },
})

const refreshOptions = [
  { label: 'Auto: 60s', value: 60000 },
  { label: 'Auto: 5 min', value: 300000 },
  { label: 'Auto: 10 min', value: 600000 },
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
    lastUpdated.value = new Date();
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

function doManualRefresh() {
  fetchStats();
  fetchSeries();
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
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Resolved',
        borderColor: '#66BB6A',
        fill: false,
        data: seriesData.value.map(p => p.resolved),
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Open',
        borderColor: '#FFA726',
        fill: false,
        data: seriesData.value.map(p => p.open),
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };
});

const lineChartOptions = {
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'nearest', intersect: false },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
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
        borderWidth: 0,
      },
    ],
  };
});

const doughnutOptions = {
  plugins: {
    legend: { position: 'bottom' },
    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}` } },
  },
  maintainAspectRatio: false,
  cutout: '65%',
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
    refreshTimer = setInterval(() => {
      fetchStats();
      // series can update less frequently; keep it light
    }, refreshInterval.value);
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

const lastUpdatedText = computed(() => {
  if (!lastUpdated.value) return '—';
  const now = new Date();
  const diff = Math.floor((now - lastUpdated.value) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
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
/* Layout */
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Hero */
.hero {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(66,165,245,.12), rgba(102,187,106,.12));
  border: 1px solid var(--surface-border);
}

.hero-left {
  display: flex;
  gap: .75rem;
  align-items: center;
}

.hero-icon {
  font-size: 1.75rem;
  color: var(--primary-color);
}

.hero-sub {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-top: .25rem;
  color: var(--text-color-secondary);
  font-size: .875rem;
}

.hero-actions {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Badge + pulse */
.badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: .125rem .5rem;
  border-radius: 999px;
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
}

.dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--primary-color);
  box-shadow: 0 0 0 0 rgba(63, 81, 181, 0.6);
  animation: pulse 1.8s infinite;
}
@keyframes pulse {
  0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(63, 81, 181, 0.5) }
  70%  { transform: scale(1.35); box-shadow: 0 0 0 10px rgba(63, 81, 181, 0) }
  100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(63, 81, 181, 0) }
}

/* Skeletons */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: .75rem;
}
.skeleton-card {
  grid-column: span 12;
  height: 88px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--surface-100), var(--surface-200), var(--surface-100));
  background-size: 200% 100%;
  animation: shimmer 1.25s linear infinite;
}
@media (min-width: 768px) {
  .skeleton-card { grid-column: span 3; }
}
.skeleton-panel {
  grid-column: span 12;
  height: 360px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--surface-100), var(--surface-200), var(--surface-100));
  background-size: 200% 100%;
  animation: shimmer 1.25s linear infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* KPI cards */
.kpi {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.kpi:before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.08;
  background: radial-gradient(120px 60px at right -20px top -20px, currentColor, transparent 70%);
  pointer-events: none;
}

.kpi-head {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.kpi-title {
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.kpi-value {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.1;
}

.kpi-icon {
  font-size: 1.2rem;
}

/* Color accents driven by text color so decorative glow inherits */
.kpi--blue  { color: #42A5F5; }
.kpi--amber { color: #FFB300; }
.kpi--green { color: #66BB6A; }
.kpi--violet{ color: #7E57C2; }

/* Panels */
.panel {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .75rem;
}

.panel-note {
  color: var(--text-color-secondary);
  font-size: .85rem;
}

/* Ensure charts take the available height */
:deep(canvas) {
  max-height: 320px;
}
</style>