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

    <div v-else class="main-layout">
      <!-- LEFT SIDEBAR: KPI cards -->
      <div class="stats-sidebar">
        <div class="kpi kpi--blue">
          <div class="kpi-head">
            <i class="pi pi-exclamation-circle kpi-icon" />
            <div class="kpi-title">Open (NEW)</div>
          </div>
          <div class="kpi-value">{{ stats.open }}</div>
          <div class="kpi-change positive">
            <i class="pi pi-arrow-up"></i> 0.45% this month
          </div>
        </div>

        <div class="kpi kpi--amber">
          <div class="kpi-head">
            <i class="pi pi-hourglass kpi-icon" />
            <div class="kpi-title">Pending (ACK + IN PROGRESS)</div>
          </div>
          <div class="kpi-value">{{ stats.pending }}</div>
          <div class="kpi-change positive">
            <i class="pi pi-arrow-up"></i> 4.43% this month
          </div>
        </div>

        <div class="kpi kpi--green">
          <div class="kpi-head">
            <i class="pi pi-check-circle kpi-icon" />
            <div class="kpi-title">Resolved</div>
          </div>
          <div class="kpi-value">{{ stats.closed }}</div>
          <div class="kpi-change positive">
            <i class="pi pi-arrow-up"></i> 1.25% this month
          </div>
        </div>

        <div class="kpi kpi--violet">
          <div class="kpi-head">
            <i class="pi pi-clock kpi-icon" />
            <div class="kpi-title">Avg Resolution (ACK → RES)</div>
          </div>
          <div class="kpi-value small-text">
            {{ formattedAvgResolution }}
          </div>
        </div>

        <div class="kpi kpi--teal">
          <div class="kpi-head">
            <i class="pi pi-users kpi-icon" />
            <div class="kpi-title">Staff (Total)</div>
          </div>
          <div class="kpi-value">{{ stats.staffTotal }}</div>
        </div>

        <div class="kpi kpi--red">
          <div class="kpi-head">
            <i class="pi pi-user-minus kpi-icon" />
            <div class="kpi-title">
              Staff Not Assigned
            </div>
          </div>
          <div class="kpi-value">{{ stats.staffBusy }}</div>
          <div class="kpi-subtitle">(assigned to open)</div>
        </div>
      </div>

      <!-- RIGHT CONTENT: Charts -->
      <div class="charts-content">
        <!-- Trend Chart - Full Width -->
        <div class="panel panel-large">
          <div class="panel-head">
            <h3 class="m-0 text-lg">Trend Overview</h3>
            <div class="panel-actions">
              <Dropdown 
                v-model="seriesDays" 
                :options="seriesDayOptions" 
                optionLabel="label" 
                optionValue="value" 
                class="w-10rem lg:hidden" 
              />
            </div>
          </div>
          <Chart type="line" :data="seriesChartData" :options="lineChartOptions" class="chart-large" />
          
          <!-- Summary Stats Below Chart -->
          <div class="summary-stats">
            <div class="summary-item">
              <div class="summary-label">Total New</div>
              <div class="summary-value">{{ stats.open + stats.pending + stats.closed }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Resolved</div>
              <div class="summary-value">{{ stats.closed }}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Issues Addressed</div>
              <div class="summary-value">{{ Math.round((stats.closed / (stats.open + stats.pending + stats.closed || 1)) * 100) }}%</div>
            </div>
          </div>
        </div>

        <!-- Bottom Row: Two Charts -->
        <div class="charts-row">
          <div class="panel">
            <div class="panel-head">
              <h3 class="m-0 text-lg">Status Breakdown</h3>
              <span class="panel-note">Distribution of all issues</span>
            </div>
            <Chart type="doughnut" :data="statusChartData" :options="doughnutOptions" />
          </div>

          <div class="panel">
            <div class="panel-head">
              <h3 class="m-0 text-lg">Issues by Category</h3>
              <span class="panel-note">Potholes, streetlights, etc.</span>
            </div>
            <Chart type="doughnut" :data="categoryChartData" :options="doughnutOptions" />
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
  staffTotal: 0,
  staffBusy: 0,
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

const categoryItems = ref([]);

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

  const staffTotal = Number(raw?.staffTotal ?? raw?.staff_total ?? raw?.staff ?? 0) || 0;
  const staffBusy = Number(raw?.staffBusy ?? raw?.staff_busy ?? raw?.staff_assigned_open ?? 0) || 0;

  return { open, closed, pending, avgResolution, breakdown, staffTotal, staffBusy };
}

async function fetchStats() {
  loading.value = true
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id');

    const r1 = await api.get(`/api/wards/${wardIdNum.value}/stats`);
    const payload = r1?.data?.data ?? r1?.data ?? r1 ?? {};
    const normalized = normalizeStats(payload);

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
      // keep whatever /stats gave us
    }

    stats.value = normalized;
    lastUpdated.value = new Date();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: getErr(err), life: 4000 });
  } finally {
    loading.value = false;
  }
}

const formattedAvgResolution = computed(() => {
  const val = stats.value?.avgResolution;
  if (val === null || val === undefined) return '—';
  if (val === 0) return '0h 0m 0s';
  return formatSeconds(val);
});

// --- Category pretty naming ---
const WRAPPER_KEYS = new Set(['success', 'message', 'error', 'errors', 'status', 'code', 'meta', 'pagination', 'data']);

function normalizeSeriesPayload(raw) {
  // Accept: {data:{series:[...]}} | {series:[...]} | [...] | {items:[...]} | {rows:[...]}
  const pickArray = (x) => {
    if (!x) return [];
    // Unwrap common envelopes
    if (x && typeof x === 'object' && x.data !== undefined) return pickArray(x.data);
    if (Array.isArray(x)) return x;
    if (Array.isArray(x.series)) return x.series;
    if (Array.isArray(x.items)) return x.items;
    if (Array.isArray(x.rows)) return x.rows;
    // Some APIs return {series:{data:[...]}}
    if (x.series && Array.isArray(x.series.data)) return x.series.data;
    return [];
  };
  const arr = pickArray(raw);
  // Map to {date,new,resolved,open}
  return arr.map((d, i) => ({
    date: d.date ?? d.day ?? d.label ?? d.createdAt ?? d.ts ?? i,
    new: Number(d.new ?? d.count_new ?? d.NEW ?? d.created ?? 0) || 0,
    resolved: Number(d.resolved ?? d.count_resolved ?? d.RESOLVED ?? d.closed ?? 0) || 0,
    open: Number(d.open ?? d.count_open ?? d.OPEN ?? d.total_open ?? 0) || 0,
  }));
}

function normalizeCategoriesPayload(raw) {
  // Unwrap nested .data if present
  if (raw && typeof raw === 'object' && raw.data !== undefined) {
    return normalizeCategoriesPayload(raw.data);
  }
  const out = [];
  const push = (label, count) => {
    const lbl = prettyCategory(label);
    const cnt = Number(count ?? 0);
    if (lbl && Number.isFinite(cnt)) out.push({ label: lbl, count: cnt });
  };

  // Array forms
  if (Array.isArray(raw)) {
    raw.forEach((it) => push(it.label ?? it.name ?? it.category, it.count ?? it.value));
    return out;
  }
  if (Array.isArray(raw?.categories)) {
    raw.categories.forEach((it) => push(it.label ?? it.name ?? it.category, it.count ?? it.value));
    return out;
  }
  if (Array.isArray(raw?.data)) {
    raw.data.forEach((it) => push(it.label ?? it.name ?? it.category, it.count ?? it.value));
    return out;
  }
  // Map/object form
  if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => {
      if (WRAPPER_KEYS.has(String(k).toLowerCase())) return; // skip envelope keys
      const num = Number(v);
      if (!Number.isFinite(num)) return; // only numeric counts
      push(k, num);
    });
    return out;
  }
  return out;
}

function prettyCategory(label) {
  const lbl = String(label ?? '').trim();
  if (!lbl) return '';
  // Add more mappings if needed
  return lbl;
}

async function fetchSeries() {
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id');
    const r = await api.get(`/api/wards/${wardIdNum.value}/stats/series`, {
      params: { days: seriesDays.value },
    });
    const payload = r?.data?.data ?? r?.data ?? {};
    seriesData.value = normalizeSeriesPayload(payload);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Series load failed', detail: getErr(err), life: 3000 });
    seriesData.value = [];
  }
}

async function fetchCategories() {
  try {
    if (!wardIdNum.value) throw new Error('Invalid ward id');

    // Try primary endpoint
    let payload;
    try {
      const r = await api.get(`/api/wards/${wardIdNum.value}/stats/categories`);
      payload = r?.data?.data ?? r?.data ?? {};
      // always unwrap .data if present
    } catch {
      // Fallback to /stats and extract possible maps
      const r2 = await api.get(`/api/wards/${wardIdNum.value}/stats`);
      payload = r2?.data?.data ?? r2?.data ?? {};
      payload = payload?.breakdown_by_category ?? payload?.categories ?? payload ?? {};
    }
    categoryItems.value = normalizeCategoriesPayload(payload);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Category load failed', detail: getErr(err), life: 3000 });
    categoryItems.value = [];
  }
}

const statusChartData = computed(() => {
  const b = stats.value.breakdown || {};
  return {
    labels: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'],
    datasets: [
      {
        data: [b.new || 0, b.acknowledged || 0, b.in_progress || 0, b.resolved || 0],
        backgroundColor: ['#42A5F5', '#FFB300', '#7E57C2', '#66BB6A'],
        borderWidth: 0,
      },
    ],
  };
});

const categoryChartData = computed(() => {
  const items = Array.isArray(categoryItems.value) ? categoryItems.value : [];
  if (items.length === 0) return { labels: [], datasets: [] };
  const labels = items.map(it => String(it.label ?? it.category ?? 'Unknown'));
  const counts = items.map(it => Number(it.count ?? it.value ?? 0) || 0);
  const base = ['#42A5F5', '#FFB300', '#AB47BC', '#66BB6A', '#26C6DA', '#EC407A', '#7E57C2', '#FFA726', '#29B6F6', '#8D6E63'];
  const colors = labels.map((_, i) => base[i % base.length]);
  return { labels, datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0 }] };
});

const seriesChartData = computed(() => {
  const rows = Array.isArray(seriesData.value) ? seriesData.value : [];
  if (rows.length === 0) return { labels: [], datasets: [] };
  const labels = rows.map(d => {
    const dt = new Date(d.date);
    return Number.isNaN(dt.getTime()) ? String(d.date) : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  return {
    labels,
    datasets: [
      { label: 'New',      data: rows.map(d => d.new),      borderColor: '#42A5F5', fill: false, tension: 0.35, pointRadius: 2 },
      { label: 'Resolved', data: rows.map(d => d.resolved), borderColor: '#66BB6A', fill: false, tension: 0.35, pointRadius: 2 },
      { label: 'Open',     data: rows.map(d => d.open),     borderColor: '#FFA726', fill: false, tension: 0.35, pointRadius: 2 },
    ],
  };
});

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'start',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15,
      }
    },
  },
  scales: {
    x: {
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(200,200,200,0.2)' },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  elements: {
    arc: { borderWidth: 0 }
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: { padding: 12, usePointStyle: true }
    }
  },
  cutout: '65%',
};

function doManualRefresh() {
  fetchStats();
  fetchSeries();
  fetchCategories();
  toast.add({ severity: 'success', summary: 'Refreshed', detail: 'Data updated', life: 2000 });
}

function exportCsv() {
  const b = stats.value.breakdown || {};
  const rows = [
    ['Metric', 'Value'],
    ['Open (NEW)', stats.value.open],
    ['Pending (ACK + IN_PROGRESS)', stats.value.pending],
    ['Resolved', stats.value.closed],
    ['Staff (Total)', stats.value.staffTotal],
    ['Staff Not Available (assigned to open)', stats.value.staffBusy],
    ['Avg Resolution (ACK→RESOLVED) [HH:MM:SS]', formattedAvgResolution.value],
    [],
    ['Status', 'Count'],
    ['NEW', b.new || 0],
    ['ACKNOWLEDGED', b.acknowledged || 0],
    ['IN_PROGRESS', b.in_progress || 0],
    ['RESOLVED', b.resolved || 0],
    [],
    ['Category', 'Count'],
    ...categoryItems.value.map(it => [String(it.label ?? it.category ?? 'Unknown'), Number(it.count ?? it.value ?? 0) || 0]),
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
    }, refreshInterval.value);
  }
}

onMounted(() => {
  fetchStats();
  fetchSeries();
  fetchCategories();
  setupAutoRefresh();

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

/* Main Layout: Sidebar + Content */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 1024px) {
  .main-layout {
    grid-template-columns: 280px 1fr;
  }
}

/* Stats Sidebar */
.stats-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* KPI cards */
.kpi {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-left: 4px solid currentColor;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.kpi:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kpi:before {
  content: '';
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  opacity: 0.06;
  background: radial-gradient(circle, currentColor, transparent 70%);
  pointer-events: none;
}

.kpi-head {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.kpi-title {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  line-height: 1.3;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text-color);
}

.kpi-value.small-text {
  font-size: 1.5rem;
}

.kpi-subtitle {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: -0.25rem;
}

.kpi-change {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.kpi-change.positive {
  color: #10B981;
}

.kpi-change.negative {
  color: #EF4444;
}

.kpi-icon {
  font-size: 1.25rem;
  opacity: 0.8;
}

/* Color accents */
.kpi--blue  { color: #42A5F5; }
.kpi--amber { color: #FFB300; }
.kpi--green { color: #66BB6A; }
.kpi--violet{ color: #7E57C2; }
.kpi--teal  { color: #26C6DA; }
.kpi--red   { color: #EF5350; }

/* Charts Content */
.charts-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr 1fr;
  }
}

/* Panels */
.panel {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.panel-large {
  min-height: 450px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
}

.panel-note {
  color: var(--text-color-secondary);
  font-size: .85rem;
}

/* Chart containers */
.chart-large {
  flex: 1;
  min-height: 300px;
}

:deep(canvas) {
  max-height: 320px;
}

/* Summary Stats */
.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-border);
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

/* Responsive adjustments */
@media (max-width: 1023px) {
  .stats-sidebar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-stats {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>