<template>
  <div class="card">
    <Toast />

    <DataTable
      :value="displayedRows"
      dataKey="id"
      :loading="loading"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 25]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} issue reports"
      responsiveLayout="scroll"
      :first="first"
      :rowClass="rowClass"
    >
      <template #header>
        <div
          class="flex flex-col gap-2 text-left md:flex-row md:items-center md:justify-between"
        >
          <h5 class="m-0 text-xl font-semibold">Manage Issue Reports</h5>
          <div class="flex items-center gap-2">
            <Button
              icon="pi pi-filter-slash"
              text
              rounded
              @click="clearFilters"
            />
            <Dropdown
              v-model="categoryFilter"
              :options="categoryOptions"
              placeholder="Any Category"
              class="w-44"
              :showClear="true"
            />
            <Dropdown
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="Any Status"
              class="w-44"
              :showClear="true"
            />
            <span class="relative">
              <i
                class="pi pi-search absolute top-2/4 -mt-2 left-3 text-surface-400 dark:text-surface-600"
              />
              <div class="relative">
                <InputText
                  v-model="titleQuery"
                  placeholder="Search title..."
                  class="pl-10 font-normal w-72"
                  @input="onTitleInput"
                />
                <ul
                  v-if="showTitleSuggestions"
                  class="absolute z-10 mt-1 w-full bg-white border rounded shadow text-sm max-h-56 overflow-auto"
                >
                  <li
                    v-for="t in titleSuggestions"
                    :key="t"
                    class="px-3 py-2 hover:bg-surface-100 cursor-pointer"
                    @click="applyTitleSuggestion(t)"
                  >
                    {{ t }}
                  </li>
                  <li
                    v-if="suggestionsLoaded && !titleSuggestions.length"
                    class="px-3 py-2 text-surface-500"
                  >
                    No matches found
                  </li>
                </ul>
              </div>
            </span>
          </div>
        </div>
      </template>

      <template #empty>
        <div class="py-4 text-center">No records found.</div>
      </template>
      <template #loading>
        <div class="py-4 text-center">Loading…</div>
      </template>

      <Column
        field="title"
        header="Title"
        :sortable="true"
        style="min-width: 16rem"
      >
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <span class="truncate">{{ data.title }}</span>
            <span
              v-if="unread[data.token] > 0"
              class="unread-chip"
              :title="`${unread[data.token]} unread`"
              >{{ unread[data.token] }}</span
            >
            <!-- Tiny escalation dot (option 2) -->
            <span
              v-if="voteSummaries[data.token]?.escalated"
              class="escalated-dot"
              tabindex="0"
              role="button"
              title="Escalated"
              aria-label="Escalated – view details"
              @click.stop="openEscalationPanel(data)"
              @keyup.enter.space.prevent="openEscalationPanel(data)"
            />
            <!-- Escalation indicator handled by left accent bar; panel via row menu -->
          </div>
        </template>
      </Column>

      <Column
        field="category"
        header="Category"
        :sortable="true"
        style="min-width: 10rem"
      >
        <template #body="{ data }">{{ data.category }}</template>
      </Column>

      <Column
        field="status"
        header="Status"
        :sortable="true"
        style="min-width: 10rem"
      >
        <template #body="{ data }">
          <Tag
            :value="data.status"
            :severity="getStatusSeverity(data.status)"
          />
        </template>
      </Column>

      <Column
        field="user.email"
        header="Reported By"
        :sortable="true"
        style="min-width: 12rem"
      >
        <template #body="{ data }">{{ data.user?.email || "N/A" }}</template>
      </Column>

      <Column
        field="createdAt"
        header="Created At"
        :sortable="true"
        style="min-width: 12rem"
      >
        <template #body="{ data }">{{
          new Date(data.createdAt).toLocaleString()
        }}</template>
      </Column>

      <Column :exportable="false" style="min-width: 14rem">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <!-- Per-row dropdown trigger -->
            <Button
              rounded
              outlined
              class="p-button-text"
              :aria-label="`Actions for ${data.title}`"
              icon="pi pi-ellipsis-v"
              @click="openRowMenu($event, data)"
            />

            <!-- Chat button with unread badge -->
            <span class="relative inline-block">
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

            <!-- Subscribe / Unsubscribe button -->
            <span class="relative inline-block">
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
      </Column>
    </DataTable>

    <!-- Popup menu shared by all rows -->
    <Menu ref="rowMenu" :model="rowMenuItems" popup />

    <!-- Create / Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :style="{ width: '450px' }"
      :header="'Edit Issue Report'"
      :modal="true"
      class="p-fluid"
    >
      <div class="flex flex-col gap-4">
        <div class="field">
          <label for="title">Title</label>
          <InputText
            id="title"
            v-model.trim="form.title"
            required="true"
            autofocus
            :class="{ 'p-invalid': !form.title && form.title !== '' }"
          />
          <small class="p-error" v-if="!form.title && form.title !== ''"
            >Title is required.</small
          >
        </div>
        <div class="field">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="form.description"
            rows="3"
            cols="20"
          />
        </div>
        <div class="field">
          <label for="category">Category</label>
          <Dropdown
            id="category"
            v-model="form.category"
            :options="categoryOptions"
            placeholder="Select a Category"
          />
        </div>
        <div class="field">
          <label for="status">Status</label>
          <Dropdown
            id="status"
            v-model="form.status"
            :options="statusOptions"
            placeholder="Select a Status"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" outlined @click="showDialog = false" />
        <Button label="Update" @click="save" />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteDialogVisible"
      modal
      header="Confirmation"
      :style="{ width: '350px' }"
    >
      <div class="flex items-center justify-center gap-4">
        <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
        <span>Are you sure you want to delete this issue report?</span>
      </div>
      <template #footer>
        <Button
          label="No"
          icon="pi pi-times"
          text
          severity="secondary"
          @click="deleteDialogVisible = false"
        />
        <Button
          label="Yes"
          icon="pi pi-check"
          outlined
          severity="danger"
          @click="deleteConfirmed"
        />
      </template>
    </Dialog>

    <!-- Maintenance Modal component -->
    <MaintenanceSchedulesModal ref="maintModal" @changed="onMaintChanged" />

    <!-- Chat Dialog -->
    <Dialog
      v-model:visible="chatDialogVisible"
      modal
      header="Report Chat"
      :style="{ width: '700px' }"
    >
      <ChatRoom v-if="chatTarget?.token" :issueToken="chatTarget.token" />
    </Dialog>

    <!-- Escalation Panel Dialog (role-based) -->
    <Dialog
      v-model:visible="escalationDialogVisible"
      modal
      :header="escalationTarget ? 'Escalation: ' + escalationTarget.title : 'Escalation'"
      :style="{ width: '650px' }"
    >
      <div v-if="escalationTarget" class="flex flex-col gap-6">
        <!-- Privileged (admin/staff) full analytics -->
        <template v-if="isPrivileged">
          <div class="flex flex-wrap gap-4">
            <div class="stat-box">
              <div class="stat-label">Weighted Total</div>
              <div class="stat-value">{{ voteSummaries[escalationTarget.token]?.total || 0 }}</div>
              <div class="stat-sub" v-if="voteSummaries[escalationTarget.token]?.threshold">Threshold {{ voteSummaries[escalationTarget.token].threshold }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Progress</div>
              <div class="stat-value">{{ escalationPercent(escalationTarget) }}%</div>
              <div class="stat-sub">{{ voteLabel(escalationTarget) }}</div>
            </div>
            <div v-if="voteSummaries[escalationTarget.token]?.escalated" class="stat-box escalated">
              <div class="stat-label">Status</div>
              <div class="stat-value flex items-center gap-1 text-green-600"><i class="pi pi-flag-fill"/> Escalated</div>
              <div class="stat-sub">Threshold reached</div>
            </div>
          </div>
          <div>
            <h4 class="font-medium mb-2">Role Breakdown</h4>
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-surface-100 dark:bg-surface-800">
                  <th class="py-2 px-2 text-left">Role</th>
                  <th class="py-2 px-2 text-right">Voters</th>
                  <th class="py-2 px-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rb in roleBreakdownArray(escalationTarget.token)" :key="rb.role">
                  <td class="py-1 px-2 capitalize">{{ rb.role }}</td>
                  <td class="py-1 px-2 text-right">{{ rb.count }}</td>
                  <td class="py-1 px-2 text-right">{{ rb.weight.toFixed(2) }}</td>
                </tr>
                <tr v-if="!roleBreakdownArray(escalationTarget.token).length">
                  <td colspan="3" class="py-3 text-center text-surface-500">No votes yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <!-- Resident simple view -->
        <template v-else>
          <div class="p-3 rounded bg-surface-100 dark:bg-surface-800 border surface-border">
            <p class="m-0 text-sm" v-if="voteSummaries[escalationTarget.token]?.escalated">This issue has been escalated for review.</p>
            <p class="m-0 text-sm" v-else>
              Support progress: <strong>{{ voteSummaries[escalationTarget.token]?.total || 0 }}</strong>
              / {{ voteSummaries[escalationTarget.token]?.threshold || 0 }} ({{ escalationPercent(escalationTarget) }}%)
            </p>
          </div>
        </template>
        <!-- Timelines -->
        <div v-if="isPrivileged">
          <h4 class="font-medium mb-2">Vote Timeline</h4>
          <div v-if="timeline(escalationTarget.token).length" class="timeline">
            <div v-for="(ev, idx) in timeline(escalationTarget.token)" :key="idx + ev.at" class="timeline-item" :class="{ crossed: ev.crossed }">
              <div class="marker" :title="ev.userRole"></div>
              <div class="content">
                <div class="line1">
                  <span class="role">{{ ev.userRole }}</span>
                  <span class="weight">+{{ ev.weight.toFixed(2) }}</span>
                  <span class="total">= {{ ev.totalAfter.toFixed(2) }}</span>
                </div>
                <div class="line2 text-xs opacity-70">
                  {{ new Date(ev.at).toLocaleString() }}
                  <span v-if="ev.crossed" class="ml-2 text-emerald-600 font-medium">Threshold reached here</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-surface-500 py-2">No votes yet</div>
        </div>
        <div v-else>
          <h4 class="font-medium mb-2">Progress Timeline</h4>
          <div v-if="progressTimeline().length" class="timeline">
            <div v-for="(step, i) in progressTimeline()" :key="i + step.at" class="timeline-item" :class="{ crossed: step.type === 'escalated' }">
              <div class="marker" :title="step.type"></div>
              <div class="content">
                <div class="line1">
                  <span class="role capitalize">{{ step.label }}</span>
                </div>
                <div class="line2 text-xs opacity-70">
                  {{ new Date(step.at).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-surface-500 py-2">No progress events yet</div>
        </div>
        <div class="flex justify-end">
          <Button label="Close" outlined @click="escalationDialogVisible = false" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onUnmounted,
  watch,
  computed,
  watchEffect,
} from "vue";
import { useToast } from "primevue/usetoast";
import {
  listIssueReports,
  updateIssueReport,
  deleteIssueReport,
  getIssueUnreadCounts,
  getIssueMessageRead,
  listIssueMessages,
  getIssueTitleSuggestions,
  subscribeWatchlist, // POST /api/issue-reports/watchlist/:token
  getWatchlist, // GET  /api/issue-reports/watchlist
  unsubscribeWatchlist, // DELETE /api/issue-reports/watchlist/:token
} from "@/utils/backend_helper";
import { castVote, getVoteSummary } from "@/utils/backend_helper";
import ChatRoom from "@/components/ChatRoom.vue";
import MaintenanceSchedulesModal from "@/components/MaintenanceSchedulesModal.vue";
import { connectSocket } from "@/utils/socket";

/* ---------- Maintenance modal wiring ---------- */
const maintModal = ref(null);
function openMaintenance(row) {
  maintModal.value?.open({ token: row.token, title: row.title });
}
function onMaintChanged() {
  // Optional: refresh the list if schedules affect anything visible here
  // await load();
}

/* ---------- Data & filters ---------- */
const rows = ref([]);
const loading = ref(false);
const unread = ref({});
let unreadTimer = null;
let socket;
const first = ref(0);

/* ---------- Voting state ---------- */
// voteSummaries[token] = { total, threshold, votes: [...], escalated: boolean }
const voteSummaries = ref({});
// voting[token] = true while request in flight
const voting = ref({});
// voted[token] = true if this user already supported
const voted = ref({});

function ensureVoteEntry(token) {
  if (!voteSummaries.value[token]) voteSummaries.value[token] = { total: 0, threshold: 0, votes: [], escalated: false };
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
    // build role breakdown
    const breakdown = {};
    for (const v of (voteSummaries.value[token].votes || [])) {
      const r = v.user?.role || 'unknown';
      if (!breakdown[r]) breakdown[r] = { count: 0, weight: 0 };
      breakdown[r].count += 1;
      breakdown[r].weight += (v.weight || 0);
    }
    voteSummaries.value[token].breakdown = breakdown;
    // detect if current user voted
    const currentUserToken = sessionStorage.getItem("token");
    if (currentUserToken) {
      voted.value[token] = voteSummaries.value[token].votes.some(v => v.user?.token === currentUserToken);
    }
    // build timeline
    const ordered = voteSummaries.value[token].votes.slice().sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
    let running = 0; const tl = []; const threshold = voteSummaries.value[token].threshold || 0; let crossedIndex = -1;
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
    // silent; keep previous values
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
      // Already voted
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

// subscription state per issue token
const subscribed = ref({}); // { [token]: true }
const pending = ref({}); // { [token]: boolean } unified pending state for sub/unsub

const categoryOptions = ref([
  "POTHOLE",
  "WATER_LEAK",
  "POWER_OUTAGE",
  "STREETLIGHT_FAILURE",
  "OTHER",
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

/* ---------- Escalation Panel Logic ---------- */
const escalationDialogVisible = ref(false);
const escalationTarget = ref(null);

function openEscalationPanel(row) {
  escalationTarget.value = row;
  escalationDialogVisible.value = true;
  fetchVoteSummary(row.token); // refresh latest numbers
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

// user role & privilege detection (admin / staff)
const currentRole = ref(sessionStorage.getItem('role') || localStorage.getItem('role') || 'resident');
const isPrivileged = computed(()=> ['admin','staff'].includes(currentRole.value));
function timeline(token){ return voteSummaries.value[token]?.timeline || []; }
function progressTimeline(){
  if(!escalationTarget.value) return [];
  const r = escalationTarget.value;
  const steps = [];
  if(r.createdAt) steps.push({ type:'created', label:'Report Created', at:r.createdAt });
  // status phases (simple linear). If status timestamps aren’t stored, we approximate by using createdAt.
  // Optionally could be enhanced by backend events.
  if(r.status && r.status !== 'NEW') steps.push({ type:'status', label:`Status: ${r.status.replace('_',' ').toLowerCase()}`, at:r.updatedAt || r.createdAt });
  const vs = voteSummaries.value[r.token];
  if(vs?.escalated){
    // Determine approximate escalation time (first threshold crossing event from vote timeline if exists)
    const crossEvent = (vs.timeline||[]).find(e=>e.crossed);
    steps.push({ type:'escalated', label:'Escalated', at: (crossEvent?.at) || r.updatedAt || r.createdAt });
  }
  if(r.status === 'RESOLVED') steps.push({ type:'resolved', label:'Resolved', at:r.updatedAt || r.createdAt });
  return steps.sort((a,b)=> new Date(a.at) - new Date(b.at));
}

const getStatusSeverity = (status) => {
  switch (status) {
    case "RESOLVED":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    case "ACKNOWLEDGED":
      return "info";
    case "NEW":
      return "primary";
    default:
      return "secondary";
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
    toast.add({
      severity: "warn",
      summary: "Validation",
      detail: "Title is required",
      life: 2500,
    });
    return;
  }
  if (!form.token) {
    toast.add({
      severity: "warn",
      summary: "Edit Only",
      detail: "Open an existing report to edit.",
      life: 2500,
    });
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
    toast.add({
      severity: "success",
      summary: "Updated",
      detail: "Issue report updated successfully.",
      life: 1500,
    });
    showDialog.value = false;
    await load();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Save failed",
      detail: e?.response?.data?.error || e.message,
      life: 3500,
    });
  }
};

/* ---------- Delete (Issue) ---------- */
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
    toast.add({
      severity: "error",
      summary: "Delete failed",
      detail: e.message,
      life: 3500,
    });
  } finally {
    deleteDialogVisible.value = false;
    deleteTarget.value = null;
  }
};

/* ---------- Chat ---------- */
const chatDialogVisible = ref(false);
const chatTarget = ref(null);

const openChat = (row) => {
  chatTarget.value = row;
  chatDialogVisible.value = true;
  if (unread.value[row.token] > 0) unread.value[row.token] = 0;
};

// Ensure that while a chat is open its unread count stays suppressed
watch([chatDialogVisible, chatTarget, unread], () => {
  if (chatDialogVisible.value && chatTarget.value?.token) {
    const t = chatTarget.value.token;
    if (unread.value[t] && unread.value[t] > 0) unread.value[t] = 0;
  }
});

/* ---------- Subscribe/Unsubscribe to watchlist ---------- */
function isSubscribed(token) {
  return !!subscribed.value[token];
}

const hydrateSubscriptions = async () => {
  try {
    const { data } = await getWatchlist();
    // Expecting data: { success, message, data: { items: [ { issue: { token }, ... } ] } }
    const items = data?.data?.items || [];
    const map = {};
    for (const row of items) {
      const t = row?.issue?.token;
      if (t) map[t] = true;
    }
    subscribed.value = map;
  } catch (e) {
    // Non-fatal; keep UI functional
  }
};

const toggleSubscription = async (row) => {
  const token = row?.token;
  if (!token) return;

  // prevent double taps while pending
  if (pending.value[token]) return;
  pending.value = { ...pending.value, [token]: true };

  try {
    if (!isSubscribed(token)) {
      // subscribe
      const { data } = await subscribeWatchlist(token);
      if (data?.success) {
        subscribed.value = { ...subscribed.value, [token]: true };
        toast.add({
          severity: "success",
          summary: "Watchlist",
          detail: data?.message || "Subscribed to watchlist.",
          life: 2000,
        });
      } else {
        toast.add({
          severity: "warn",
          summary: "Watchlist",
          detail: data?.message || "Unable to subscribe.",
          life: 2500,
        });
      }
    } else {
      // unsubscribe
      const { data } = await unsubscribeWatchlist(token);
      if (data?.success) {
        const next = { ...subscribed.value };
        delete next[token];
        subscribed.value = next;
        toast.add({
          severity: "success",
          summary: "Watchlist",
          detail: data?.message || "Unsubscribed from watchlist.",
          life: 2000,
        });
      } else {
        toast.add({
          severity: "warn",
          summary: "Watchlist",
          detail: data?.message || "Unable to unsubscribe.",
          life: 2500,
        });
      }
    }
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      (isSubscribed(token)
        ? "Could not unsubscribe from watchlist."
        : "Could not subscribe to watchlist.");
    toast.add({
      severity: "error",
      summary: "Watchlist",
      detail: msg,
      life: 3000,
    });
  } finally {
    pending.value = { ...pending.value, [token]: false };
  }
};

/* ---------- Load & unread ---------- */
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

    // Refresh unread counts
    await refreshUnread();
    await fetchAllVoteSummaries();

    // Hydrate which issues the user is already subscribed to
    await hydrateSubscriptions();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Load failed",
      detail: e.message,
      life: 3500,
    });
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
            const last = r?.last_seen_at
              ? new Date(r.last_seen_at).getTime()
              : null;
            const list = Array.isArray(msgs) ? msgs : [];
            const cnt = list.filter(
              (m) =>
                m?.author?.token !== currentUserToken &&
                (!last || new Date(m.createdAt).getTime() > last)
            ).length;
            return [t, cnt];
          } catch {
            return [t, 0];
          }
        })
      );
      obj = Object.fromEntries(perToken);
    }
    // Apply counts
    unread.value = obj;
    // If user currently has a chat dialog open for a specific issue, suppress unread for that issue
    if (chatDialogVisible.value && chatTarget.value?.token) {
      const t = chatTarget.value.token;
      if (unread.value[t] && unread.value[t] > 0) unread.value[t] = 0;
    }
  } catch {
    // silent
  }
};

onMounted(async () => {
  await load();
  socket = connectSocket();
  const onInvalidate = async () => {
    await refreshUnread();
  };
  const onConnect = () => {
    if (unreadTimer) {
      clearInterval(unreadTimer);
      unreadTimer = null;
    }
    // Ensure a fresh fetch on connect
    void refreshUnread();
  };
  const onDisconnect = () => {
    if (!unreadTimer) unreadTimer = setInterval(refreshUnread, 5000);
  };
  const onVoteUpdated = (payload) => {
    if (!payload?.issueToken) return;
    // Refresh only that issue's summary (avoid reloading entire list)
    fetchVoteSummary(payload.issueToken);
  };
  // attach listeners
  socket.on("unread:invalidate", onInvalidate);
  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on('vote:updated', onVoteUpdated);
  // If not yet connected, keep polling until connected
  if (!socket.connected && !unreadTimer)
    unreadTimer = setInterval(refreshUnread, 5000);

  // Cleanup on unmount
  onUnmounted(() => {
    if (unreadTimer) {
      clearInterval(unreadTimer);
      unreadTimer = null;
    }
    try {
      socket.off("unread:invalidate", onInvalidate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off('vote:updated', onVoteUpdated);
    } catch {}
  });
});

// note: the cleanup is handled inside onMounted's nested onUnmounted

/* ---------- Title suggestions ---------- */
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
      // Build params including active filters so suggestions are scoped correctly
      const params = {};
      if (categoryFilter.value) params.category = categoryFilter.value;
      if (statusFilter.value) params.status = statusFilter.value;
      params.title = q;
      const { data } = await listIssueReports(params);
      if (lastSuggestReq !== reqId) return;
      const rowsArr = Array.isArray(data) ? data : [];
      // Derive unique titles from filtered rows
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

/* ---------- Row dropdown menu logic ---------- */
const rowMenu = ref(); // <Menu> ref
const rowMenuItems = ref([]); // dynamic items per row
const activeRow = ref(null); // keep track of which row is active

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
        ...(row.status === 'RESOLVED' ? [{
          label: 'Voting closed (resolved)',
          icon: 'pi pi-lock',
          disabled: true
        }] : [])
      ]
    }
  ];
  // Always show escalation submenu; adapt contents based on state
  const escalated = voteSummaries.value[row.token]?.escalated;
  const escItems = escalated
    ? [
        { label: 'View Escalation Panel', icon: 'pi pi-external-link', command: () => openEscalationPanel(row) },
        { label: 'Escalated', icon: 'pi pi-flag-fill', disabled: true }
      ]
    : [
        { label: `Progress: ${escalationPercent(row)}%`, icon: 'pi pi-chart-line', disabled: true },
      ];
  rowMenuItems.value.push({
    label: 'Escalation',
    icon: 'pi pi-flag',
    items: escItems
  });
  rowMenu.value.toggle(event);
}
</script>

<style scoped>
.unread-chip {
  background: var(--primary-500);
  color: white;
  border-radius: 9999px;
  padding: 0 0.5rem;
  font-size: 0.75rem;
}

/* subtle style to make subscribe button feel distinct yet consistent */
.subscribe-btn :deep(.p-button-icon) {
  font-size: 1rem;
}

/* Escalation visuals – subtle left accent bar */
.escalated-row :deep(td:first-child) { position: relative; }
.escalated-row :deep(td:first-child)::before {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 4px;
  border-radius: 2px;
  background: linear-gradient(to bottom,#fb923c,#f87171);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
  transition: box-shadow .25s ease, transform .25s ease;
}
.escalated-row:hover :deep(td:first-child)::before,
.escalated-row:focus-within :deep(td:first-child)::before {
  box-shadow: 0 0 0 1px rgba(0,0,0,0.12), 0 0 0 4px rgba(251,146,60,0.25);
  transform: translateZ(0); /* trigger GPU */
}

/* Tiny escalation dot */
.escalated-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #f87171, #dc2626);
  box-shadow: 0 0 0 2px rgba(220,38,38,0.18);
  display: inline-block;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease;
}
.escalated-dot:hover,
.escalated-dot:focus {
  outline: none;
  transform: scale(1.35);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.32);
}

.stat-box {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  min-width: 140px;
  flex: 1 1 140px;
}
.stat-box.escalated {
  border-color: #16a34a;
  background: #f0fdf4;
}
.stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: .05em; opacity: .75; }
.stat-value { font-size: 1.25rem; font-weight: 600; }
.stat-sub { font-size: .7rem; opacity: .7; }

/* Timeline */
.timeline { display:flex; flex-direction:column; gap:.75rem; }
.timeline-item { display:flex; gap:.75rem; }
.timeline-item .marker { width:.75rem; height:.75rem; border-radius:50%; background: var(--primary-500); margin-top:.4rem; }
.timeline-item.crossed .marker { background:#16a34a; }
.timeline-item .line1 { font-size:.75rem; display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
.timeline-item .role { text-transform:capitalize; font-weight:500; }
.timeline-item .weight { color:#2563eb; }
.timeline-item.crossed .total { font-weight:600; color:#16a34a; }
</style>
