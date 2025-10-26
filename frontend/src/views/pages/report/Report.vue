<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Reported Issues</h3>
      </div>
      <div class="card-body">
        <div class="flex flex-wrap gap-4 mb-4">
          <InputText v-model="titleQuery" placeholder="Search by title" @input="onTitleInput" class="w-full md:w-auto" />
          <Select v-model="categoryFilter" :options="categoryOptions" placeholder="Filter by category" showClear class="w-full md:w-auto" />
          <Select v-model="statusFilter" :options="statusOptions" placeholder="Filter by status" showClear class="w-full md:w-auto" />
          <Button label="Clear Filters" outlined @click="clearFilters" class="w-full md:w-auto" />
        </div>

        <div v-if="loading" class="text-center">
          <ProgressSpinner />
          <p>Loading...</p>
        </div>

        <div v-else-if="!displayedRows.length" class="text-center text-surface-500 py-8">
          <i class="pi pi-inbox" style="font-size: 2rem"></i>
          <p class="mt-2">No records found.</p>
        </div>

      <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fit, 280px);">
        <Card v-for="data in displayedRows" :key="data.token" class="relative" :class="rowClass(data)" style="min-width: 250px; width: 100%; height: 420px;">
          <!-- Menu Button (Top Right) -->
          <template #header>
            <div class="absolute top-2 right-2 z-10">
              <Button 
                icon="pi pi-ellipsis-v" 
                rounded 
                @click="openRowMenu($event, data)"
                style="background-color: white; color: black; border: 1px solid #e5e7eb;"
              />
            </div>

            <!-- Galleria for reports with images -->
            <Galleria
              v-if="data.attachments && data.attachments.length"
              :key="data.token + '-galleria'"
              :value="data.attachments"
              :numVisible="1"
              containerStyle="max-width: 100%"
              :showThumbnails="false"
              :showIndicators="true"
            >
              <template #item="slotProps">
                <img
                  :src="slotProps.item.file_link"
                  :alt="slotProps.item.description || 'Report image'"
                  style="width: 100%; display: block; height: 200px; object-fit: cover;"
                />
              </template>
            </Galleria>

            <!-- Default image for reports without attachments -->
            <div v-else class="h-[250px] w-full">
              <img 
                :src="`${apiUrl}/default-report-image.png`"
                alt="Default report image"
                style="width: 100%; display: block; height: 250px; object-fit: cover;"
              />
            </div>
          </template>


          <template #title>
            <h5 
              class="font-bold mt-2 line-clamp-1" 
              v-tooltip.top="data.title"
            >
              {{ data.title }}
            </h5>
          </template>

          <template #subtitle>
            <p class="text-sm text-surface-500">{{ data.category }}</p>
          </template>

          <template #content>
            <p class="text-sm text-surface-600">
              {{ data.user?.first_name || "N/A" }} on {{ new Date(data.createdAt).toLocaleDateString() }}
            </p>
          </template>

          <template #footer>
            <div class="mt-2 flex gap-2 width-full items-center">
              <span class="relative inline-block width-full">
                <Button
                  icon="pi pi-comments"
                  label="Chat"
                  outlined
                  rounded
                  severity="help"
                  @click="openChat(data)"
                />
                <span
                  v-if="unread[data.token] > 0"
                  class="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full px-2 py-0.5 shadow"
                >
                  {{ unread[data.token] }}
                </span>
              </span>
              <span class="relative inline-block width-full">
                <Button
                  :icon="
                    isSubscribed(data.token) ? 'pi pi-bell-slash' : 'pi pi-bell'
                  "
                  :label="isSubscribed(data.token) ? 'Unsubscribe' : 'Subscribe'"
                  :outlined="!isSubscribed(data.token)"
                  rounded
                  severity="secondary"
                  :disabled="pending[data.token] === true"
                  :loading="pending[data.token] === true"
                  @click="toggleSubscription(data)"
                  :aria-label="
                    isSubscribed(data.token)
                      ? 'Unsubscribe from watchlist'
                      : 'Subscribe to watchlist'
                  "
                  class="subscribe-btn"
                />
                <i
                  v-if="isSubscribed(data.token)"
                  class="pi pi-check-circle absolute -top-2 -right-2 text-green-500 text-base"
                  aria-hidden="true"
                  :title="'You are subscribed'"
                />
              </span>
            </div>
          </template>
        </Card>
        </div>
      </div>
    </div>
    <Menu ref="rowMenu" :model="rowMenuItems" :popup="true" />

    <!-- Dialogs and Modals -->

    <Dialog v-model:visible="deleteDialogVisible" modal header="Confirmation" :style="{ width: '350px' }">
      <div class="flex items-center justify-center gap-4">
        <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
        <span>Are you sure you want to delete this issue report?</span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" text severity="secondary" @click="deleteDialogVisible = false" />
        <Button label="Yes" icon="pi pi-check" outlined severity="danger" @click="deleteConfirmed" />
      </template>
    </Dialog>

    <MaintenanceSchedulesModal ref="maintModal" @changed="onMaintChanged"></MaintenanceSchedulesModal>

    <Dialog v-model:visible="chatDialogVisible" modal header="Report Chat" :style="{ width: '700px' }">
      <ChatRoom v-if="chatTarget?.token" :issueToken="chatTarget.token"></ChatRoom>
    </Dialog>

    <Dialog v-model:visible="escalationDialogVisible" modal :header="escalationTarget ? 'Escalation: ' + escalationTarget.title : 'Escalation'" :style="{ width: '650px' }">
      <div v-if="escalationTarget" class="flex flex-col gap-6">
        <template v-if="isPrivileged">
          <!-- Privileged (admin/staff) full analytics -->
        </template>
        <template v-else>
          <!-- Resident simple view -->
        </template>
        <div class="flex justify-end">
          <Button label="Close" outlined @click="escalationDialogVisible = false"></Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, watchEffect, } from "vue";
import { useToast } from "primevue/usetoast";
import {
  listIssueReports,
  updateIssueReport,
  deleteIssueReport,
  getIssueUnreadCounts,
  getIssueMessageRead,
  listIssueMessages,
  getIssueTitleSuggestions,
  subscribeWatchlist,
  getWatchlist,
  unsubscribeWatchlist,
} from "@/utils/backend_helper";
import { castVote, getVoteSummary } from "@/utils/backend_helper";
import ChatRoom from "@/components/ChatRoom.vue";
import MaintenanceSchedulesModal from "@/components/MaintenanceSchedulesModal.vue";
import { connectSocket } from "@/utils/socket";

const apiUrl = "";

const maintModal = ref(null);
function openMaintenance(row) {
  maintModal.value?.open({ token: row.token, title: row.title });
}
function onMaintChanged() {
  // await load();
}

const rows = ref([]);
const loading = ref(false);
const unread = ref({});
let unreadTimer = null;
let socket;
const first = ref(0);

const voteSummaries = ref({});
const voting = ref({});
const voted = ref({});

function ensureVoteEntry(token) {
  if (!voteSummaries.value[token]) {
    voteSummaries.value[token] = { total: 0, threshold: 0, votes: [], escalated: false };
  }
}

async function fetchVoteSummary(token) {
  if (!token) return;
  try {
    const { data } = await getVoteSummary(token);
    ensureVoteEntry(token);
    voteSummaries.value[token].total = data.total || 0;
    voteSummaries.value[token].threshold = data.threshold || 0;
    voteSummaries.value[token].votes = Array.isArray(data.votes) ? data.votes : [];
    voteSummaries.value[token].escalated = (data.total || 0) >= (data.threshold || 0) && (data.threshold || 0) > 0;

    const breakdown = {};
    for (const v of (voteSummaries.value[token].votes || [])) {
      const r = v.user?.role || 'unknown';
      if (!breakdown[r]) breakdown[r] = { count: 0, weight: 0 };
      breakdown[r].count += 1;
      breakdown[r].weight += (v.weight || 0);
    }
    voteSummaries.value[token].breakdown = breakdown;

    const currentUserToken = sessionStorage.getItem("token");
    if (currentUserToken) {
      voted.value[token] = voteSummaries.value[token].votes.some(v => v.user?.token === currentUserToken);
    }

    const ordered = voteSummaries.value[token].votes.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let running = 0;
    const tl = [];
    const threshold = voteSummaries.value[token].threshold || 0;
    let crossedIndex = -1;
    for (const v of ordered) {
      const before = running;
      running += (v.weight || 0);
      const crossed = threshold > 0 && before < threshold && running >= threshold;
      if (crossed && crossedIndex === -1) crossedIndex = tl.length;
      tl.push({ at: v.createdAt, weight: v.weight || 0, userRole: v.user?.role || 'unknown', totalAfter: running, crossed });
    }
    voteSummaries.value[token].timeline = tl;
    voteSummaries.value[token].crossedIndex = crossedIndex;
  } catch (e) {
    // silent
  }
}

async function fetchAllVoteSummaries() {
  const tokens = rows.value.map(r => r.token).filter(Boolean);
  await Promise.all(tokens.map(t => fetchVoteSummary(t)));
}

async function onVote(row) {
  const token = row?.token;
  if (!token || voting.value[token] || voted.value[token]) return;
  voting.value[token] = true;
  try {
    await castVote(token);
    toast.add({ severity: "success", summary: "Supported", detail: "Your support has been recorded", life: 1500 });
  } catch (e) {
    if (e?.response?.status === 409) {
      toast.add({ severity: "info", summary: "Already Supported", life: 1500 });
      voted.value[token] = true;
    } else {
      toast.add({ severity: "error", summary: "Vote failed", detail: e?.response?.data?.error || e.message, life: 2500 });
    }
  } finally {
    await fetchVoteSummary(token);
    voting.value[token] = false;
  }
}

function voteProgress(row) {
  const vs = voteSummaries.value[row.token];
  if (!vs || !vs.threshold) return 0;
  return Math.min(100, Math.round((vs.total / vs.threshold) * 100));
}

function voteLabel(row) {
  const vs = voteSummaries.value[row.token];
  if (!vs) return "0";
  if (vs.escalated) return `Escalated (${vs.total}/${vs.threshold})`;
  if (vs.threshold) return `${vs.total}/${vs.threshold}`;
  return `${vs.total}`;
}

function voteButtonDisabled(row) {
  const token = row.token;
  if (row.status === 'RESOLVED') return true;
  return voting.value[token] || voted.value[token];
}

function voteStatsLabel(row) {
  const vs = voteSummaries.value[row.token];
  if (!vs) return '0';
  if (vs.threshold) return `${vs.total}/${vs.threshold}`;
  return String(vs.total);
}

const categoryFilter = ref(null);
const statusFilter = ref(null);
const titleQuery = ref("");
const titleSuggestions = ref([]);
const showTitleSuggestions = ref(false);
const suggestionsLoaded = ref(false);
const suggestionsLoading = ref(false);
const suggestionsError = ref(false);

const subscribed = ref({});
const pending = ref({});

const categoryOptions = ref([
  "POTHOLE", "WATER_LEAK", "POWER_OUTAGE", "STREETLIGHT_FAILURE", "OTHER",
]);
const statusOptions = ref(["NEW", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"]);

const displayedRows = computed(() => {
  let list = Array.isArray(rows.value) ? rows.value : [];
  const q = (titleQuery.value || "").trim().toLowerCase();
  if (q) list = list.filter((r) => (r.title || "").toLowerCase().includes(q));
  if (categoryFilter.value) list = list.filter((r) => r.category === categoryFilter.value);
  if (statusFilter.value) list = list.filter((r) => r.status === statusFilter.value);
  const progress = (r) => {
    const vs = voteSummaries.value[r.token];
    if (!vs?.threshold || vs.threshold === 0) return 0;
    return Math.min(1, vs.total / vs.threshold);
  };
  return [...list].sort((a, b) => progress(b) - progress(a));
});

const escalationDialogVisible = ref(false);
const escalationTarget = ref(null);

function openEscalationPanel(row) {
  escalationTarget.value = row;
  escalationDialogVisible.value = true;
  fetchVoteSummary(row.token);
}

function escalationPercent(row) {
  const vs = voteSummaries.value[row.token];
  if (!vs?.threshold) return 0;
  return Math.min(100, Math.round((vs.total / vs.threshold) * 100));
}

function escalationTooltip(row) {
  const vs = voteSummaries.value[row.token];
  if (!vs) return 'Escalated';
  if (vs.threshold) return `Escalated: ${vs.total}/${vs.threshold} (${escalationPercent(row)}%)`;
  return `Escalated: ${vs.total}`;
}

function roleBreakdownArray(token) {
  const vs = voteSummaries.value[token];
  if (!vs?.breakdown) return [];
  return Object.entries(vs.breakdown)
    .map(([role, obj]) => ({ role, count: obj.count, weight: obj.weight }))
    .sort((a, b) => b.weight - a.weight);
}

function rowClass(row) {
  return voteSummaries.value[row.token]?.escalated ? 'escalated-row' : '';
}

const currentRole = ref(sessionStorage.getItem('role') || localStorage.getItem('role') || 'resident');
const isPrivileged = computed(() => ['admin', 'staff'].includes(currentRole.value));

function timeline(token) {
  return voteSummaries.value[token]?.timeline || [];
}

function progressTimeline() {
  if (!escalationTarget.value) return [];
  const r = escalationTarget.value;
  const steps = [];
  if (r.createdAt) steps.push({ type: 'created', label: 'Report Created', at: r.createdAt });
  if (r.status && r.status !== 'NEW') steps.push({ type: 'status', label: `Status: ${r.status.replace('_', ' ').toLowerCase()}`, at: r.updatedAt || r.createdAt });
  const vs = voteSummaries.value[r.token];
  if (vs?.escalated) {
    const crossEvent = (vs.timeline || []).find(e => e.crossed);
    steps.push({ type: 'escalated', label: 'Escalated', at: (crossEvent?.at) || r.updatedAt || r.createdAt });
  }
  if (r.status === 'RESOLVED') steps.push({ type: 'resolved', label: 'Resolved', at: r.updatedAt || r.createdAt });
  return steps.sort((a, b) => new Date(a.at) - new Date(b.at));
}

const getStatusSeverity = (status) => {
  switch (status) {
    case "RESOLVED": return "success";
    case "IN_PROGRESS": return "warning";
    case "ACKNOWLEDGED": return "info";
    case "NEW": return "primary";
    default: return "secondary";
  }
};

const clearFilters = () => {
  categoryFilter.value = null;
  statusFilter.value = null;
  titleQuery.value = "";
  titleSuggestions.value = [];
  showTitleSuggestions.value = false;
  load();
};

const toast = useToast();
const showDialog = ref(false);
const isEdit = ref(false);
const form = reactive({
  id: null,
  token: null,
  title: "",
  description: "",
  category: "POTHOLE",
  status: "NEW",
});

const openEdit = (row) => {
  Object.assign(form, row);
  isEdit.value = true;
  showDialog.value = true;
};

const save = async () => {
  if (!form.title?.trim()) {
    toast.add({ severity: "warn", summary: "Validation", detail: "Title is required", life: 2500 });
    return;
  }
  if (!form.token) {
    toast.add({ severity: "warn", summary: "Edit Only", detail: "Open an existing report to edit.", life: 2500 });
    return;
  }
  const payload = {
    title: form.title,
    description: form.description,
    category: form.category,
    status: form.status,
  };
  try {
    await updateIssueReport(form.token, payload);
    toast.add({ severity: "success", summary: "Updated", detail: "Issue report updated successfully.", life: 1500 });
    showDialog.value = false;
    await load();
  } catch (e) {
    toast.add({ severity: "error", summary: "Save failed", detail: e?.response?.data?.error || e.message, life: 3500 });
  }
};

const deleteDialogVisible = ref(false);
const deleteTarget = ref(null);

const confirmDelete = (row) => {
  deleteTarget.value = row;
  deleteDialogVisible.value = true;
};

const deleteConfirmed = async () => {
  if (!deleteTarget.value?.token) return;
  try {
    await deleteIssueReport(deleteTarget.value.token);
    toast.add({ severity: "success", summary: "Deleted", life: 1500 });
    await load();
  } catch (e) {
    toast.add({ severity: "error", summary: "Delete failed", detail: e.message, life: 3500 });
  } finally {
    deleteDialogVisible.value = false;
    deleteTarget.value = null;
  }
};

const chatDialogVisible = ref(false);
const chatTarget = ref(null);

const openChat = (row) => {
  chatTarget.value = row;
  chatDialogVisible.value = true;
  if (unread.value[row.token] > 0) unread.value[row.token] = 0;
};

watch([chatDialogVisible, chatTarget, unread], () => {
  if (chatDialogVisible.value && chatTarget.value?.token) {
    const t = chatTarget.value.token;
    if (unread.value[t] && unread.value[t] > 0) unread.value[t] = 0;
  }
});

function isSubscribed(token) {
  return !!subscribed.value[token];
}

const hydrateSubscriptions = async () => {
  try {
    const { data } = await getWatchlist();
    const items = data?.data?.items || [];
    const map = {};
    for (const row of items) {
      const t = row?.issue?.token;
      if (t) map[t] = true;
    }
    subscribed.value = map;
  } catch (e) {
    // Non-fatal
  }
};

const toggleSubscription = async (row) => {
  const token = row?.token;
  if (!token) return;
  if (pending.value[token]) return;
  pending.value = { ...pending.value, [token]: true };
  try {
    if (!isSubscribed(token)) {
      const { data } = await subscribeWatchlist(token);
      if (data?.success) {
        subscribed.value = { ...subscribed.value, [token]: true };
        toast.add({ severity: "success", summary: "Watchlist", detail: data?.message || "Subscribed to watchlist.", life: 2000 });
      } else {
        toast.add({ severity: "warn", summary: "Watchlist", detail: data?.message || "Unable to subscribe.", life: 2500 });
      }
    } else {
      const { data } = await unsubscribeWatchlist(token);
      if (data?.success) {
        const next = { ...subscribed.value };
        delete next[token];
        subscribed.value = next;
        toast.add({ severity: "success", summary: "Watchlist", detail: data?.message || "Unsubscribed from watchlist.", life: 2000 });
      } else {
        toast.add({ severity: "warn", summary: "Watchlist", detail: data?.message || "Unable to unsubscribe.", life: 2500 });
      }
    }
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || (isSubscribed(token) ? "Could not unsubscribe from watchlist." : "Could not subscribe to watchlist.");
    toast.add({ severity: "error", summary: "Watchlist", detail: msg, life: 3000 });
  } finally {
    pending.value = { ...pending.value, [token]: false };
  }
};

const load = async () => {
  loading.value = true;
  try {
    const params = {};
    if (categoryFilter.value) params.category = categoryFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    if (titleQuery.value?.trim()) params.title = titleQuery.value.trim();
    const { data } = await listIssueReports(params);
    rows.value = Array.isArray(data) ? data : [];
    
    first.value = 0;
    await refreshUnread();
    await fetchAllVoteSummaries();
    await hydrateSubscriptions();
  } catch (e) {
    toast.add({ severity: "error", summary: "Load failed", detail: e.message, life: 3500 });
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const refreshUnread = async () => {
  try {
    const tokens = rows.value.map((r) => r.token);
    if (!tokens.length) {
      unread.value = {};
      return;
    }
    const { data } = await getIssueUnreadCounts(tokens);
    const counts = data?.counts || {};
    let obj = {};
    for (const t of tokens) obj[t] = counts[t] || 0;
    const allZero = Object.values(obj).every((v) => v === 0);
    if (allZero) {
      const currentUserToken = sessionStorage.getItem("token");
      const perToken = await Promise.all(
        tokens.map(async (t) => {
          try {
            const [{ data: r }, { data: msgs }] = await Promise.all([
              getIssueMessageRead(t),
              listIssueMessages(t),
            ]);
            const last = r?.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
            const list = Array.isArray(msgs) ? msgs : [];
            const cnt = list.filter(
              (m) => m?.author?.token !== currentUserToken && (!last || new Date(m.createdAt).getTime() > last)
            ).length;
            return [t, cnt];
          } catch {
            return [t, 0];
          }
        })
      );
      obj = Object.fromEntries(perToken);
    }
    unread.value = obj;
    if (chatDialogVisible.value && chatTarget.value?.token) {
      const t = chatTarget.value.token;
      if (unread.value[t] && unread.value[t] > 0) unread.value[t] = 0;
    }
  } catch {
    // silent
  }
};

const onInvalidate = async () => {
  await refreshUnread();
};

const onConnect = () => {
  if (unreadTimer) {
    clearInterval(unreadTimer);
    unreadTimer = null;
  }
  void refreshUnread();
};

const onDisconnect = () => {
  if (!unreadTimer) {
    unreadTimer = setInterval(refreshUnread, 5000);
  }
};

const onVoteUpdated = (payload) => {
  if (!payload?.issueToken) return;
  fetchVoteSummary(payload.issueToken);
};

onMounted(async () => {
  await load();
  socket = connectSocket();
  socket.on("unread:invalidate", onInvalidate);
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on('vote:updated', onVoteUpdated);
  if (!socket.connected && !unreadTimer) {
    unreadTimer = setInterval(refreshUnread, 5000);
  }
});

onUnmounted(() => {
  if (unreadTimer) {
    clearInterval(unreadTimer);
    unreadTimer = null;
  }
  if (socket) {
    socket.off("unread:invalidate", onInvalidate);
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
    socket.off('vote:updated', onVoteUpdated);
    socket.disconnect();
  }
});

let titleDebounce;
let lastSuggestReq = 0;

const onTitleInput = async () => {
  const q = titleQuery.value?.trim() || "";
  if (titleDebounce) clearTimeout(titleDebounce);
  if (!q) {
    showTitleSuggestions.value = false;
    titleSuggestions.value = [];
    suggestionsLoaded.value = false;
    suggestionsError.value = false;
    await load();
    return;
  }
  showTitleSuggestions.value = true;
  titleDebounce = setTimeout(async () => {
    const reqId = Date.now();
    lastSuggestReq = reqId;
    suggestionsLoaded.value = false;
    suggestionsLoading.value = true;
    suggestionsError.value = false;
    try {
      const params = {};
      if (categoryFilter.value) params.category = categoryFilter.value;
      if (statusFilter.value) params.status = statusFilter.value;
      params.title = q;
      const { data } = await listIssueReports(params);
      if (lastSuggestReq !== reqId) return;
      const rowsArr = Array.isArray(data) ? data : [];
      const set = new Set();
      for (const r of rowsArr) {
        if (
          typeof r?.title === "string" &&
          r.title.toLowerCase().includes(q.toLowerCase())
        )
          set.add(r.title);
        if (set.size >= 10) break;
      }
      titleSuggestions.value = Array.from(set);
      suggestionsLoaded.value = true;
      suggestionsLoading.value = false;
    } catch {
      if (lastSuggestReq !== reqId) return;
      titleSuggestions.value = [];
      suggestionsLoaded.value = true;
      suggestionsLoading.value = false;
      suggestionsError.value = true;
    }
    load();
  }, 250);
};

function truncateTitle(title, limit = 25) {
  if (!title) return '';
  if (title.length > limit) {
    return title.substring(0, limit) + '...';
  }
  return title;
}

const applyTitleSuggestion = (t) => {
  titleQuery.value = t;
  showTitleSuggestions.value = false;
  load();
};

watch(categoryFilter, () => {
  load();
  first.value = 0;
});
watch(statusFilter, () => {
  load();
  first.value = 0;
});
watchEffect(() => {
  void titleQuery.value;
  first.value = 0;
});

const rowMenu = ref();
const rowMenuItems = ref([]);
const activeRow = ref(null);

function openRowMenu(event, row) {
  activeRow.value = row;
  rowMenuItems.value = [
    {
      label: "Edit",
      icon: "pi pi-pencil",
      command: () => openEdit(row),
    },
    {
      label: "Delete",
      icon: "pi pi-trash",
      command: () => confirmDelete(row),
    },
    { separator: true },
    {
      label: "Maintenance",
      icon: "pi pi-calendar",
      command: () => openMaintenance(row),
    },
    {
      label: "Voting",
      icon: "pi pi-chart-line",
      items: [
        {
          label: voted.value[row.token] ? 'Supported' : 'Support',
          icon: voted.value[row.token] ? 'pi pi-check' : 'pi pi-thumbs-up',
          disabled: voteButtonDisabled(row),
          command: () => onVote(row)
        },
        {
          label: `Weighted: ${voteStatsLabel(row)}`,
          icon: 'pi pi-sliders-h',
          disabled: true
        },
        ...(row.status === 'RESOLVED' ? [{ label: 'Voting closed (resolved)', icon: 'pi pi-lock', disabled: true }] : [])
      ]
    }
  ];

  const escalated = voteSummaries.value[row.token]?.escalated;
  const escItems = escalated ? [
    { label: 'View Escalation Panel', icon: 'pi pi-external-link', command: () => openEscalationPanel(row) },
    { label: 'Escalated', icon: 'pi pi-flag-fill', disabled: true }
  ] : [
    { label: `Progress: ${escalationPercent(row)}%`, icon: 'pi pi-chart-line', disabled: true },
  ];
  rowMenuItems.value.push({ label: 'Escalation', icon: 'pi pi-flag', items: escItems });
  rowMenu.value.toggle(event);
}
</script>
<style scoped>
.escalated-row {
  border-left: 4px solid;
  border-image: linear-gradient(to bottom, #fb923c, #f87171) 1;
}
</style>