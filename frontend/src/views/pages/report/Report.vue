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
    >
      <template #header>
        <div class="flex flex-col gap-2 text-left md:flex-row md:items-center md:justify-between">
          <h5 class="m-0 text-xl font-semibold">Manage Issue Reports</h5>
          <div class="flex items-center gap-2">
            <Button icon="pi pi-filter-slash" text rounded @click="clearFilters" />
            <Dropdown v-model="categoryFilter" :options="categoryOptions" placeholder="Any Category" class="w-44" :showClear="true" />
            <Dropdown v-model="statusFilter" :options="statusOptions" placeholder="Any Status" class="w-44" :showClear="true" />
            <span class="relative">
              <i class="pi pi-search absolute top-2/4 -mt-2 left-3 text-surface-400 dark:text-surface-600" />
              <div class="relative">
                <InputText
                  v-model="titleQuery"
                  placeholder="Search title..."
                  class="pl-10 font-normal w-72"
                  @input="onTitleInput"
                />
                <ul v-if="showTitleSuggestions" class="absolute z-10 mt-1 w-full bg-white border rounded shadow text-sm max-h-56 overflow-auto">
                  <li
                    v-for="t in titleSuggestions"
                    :key="t"
                    class="px-3 py-2 hover:bg-surface-100 cursor-pointer"
                    @click="applyTitleSuggestion(t)"
                  >{{ t }}</li>
                  <li v-if="suggestionsLoaded && !titleSuggestions.length" class="px-3 py-2 text-surface-500">No matches found</li>
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

      <Column field="title" header="Title" :sortable="true" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <span class="truncate">{{ data.title }}</span>
            <span v-if="unread[data.token] > 0" class="unread-chip" :title="`${unread[data.token]} unread`">{{ unread[data.token] }}</span>
          </div>
        </template>
      </Column>

      <Column field="category" header="Category" :sortable="true" style="min-width: 10rem">
        <template #body="{ data }">{{ data.category }}</template>
      </Column>

      <Column field="status" header="Status" :sortable="true" style="min-width: 10rem">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>

      <Column field="user.email" header="Reported By" :sortable="true" style="min-width: 12rem">
        <template #body="{ data }">{{ data.user?.email || 'N/A' }}</template>
      </Column>

      <Column field="createdAt" header="Created At" :sortable="true" style="min-width: 12rem">
        <template #body="{ data }">{{ new Date(data.createdAt).toLocaleString() }}</template>
      </Column>

      <Column :exportable="false" style="min-width: 10rem">
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

            <!-- Separate Chat button with unread badge -->
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
          <small class="p-error" v-if="!form.title && form.title !== ''">Title is required.</small>
        </div>
        <div class="field">
          <label for="description">Description</label>
          <Textarea id="description" v-model="form.description" rows="3" cols="20" />
        </div>
        <div class="field">
          <label for="category">Category</label>
          <Dropdown id="category" v-model="form.category" :options="categoryOptions" placeholder="Select a Category" />
        </div>
        <div class="field">
          <label for="status">Status</label>
          <Dropdown id="status" v-model="form.status" :options="statusOptions" placeholder="Select a Status" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" outlined @click="showDialog = false" />
        <Button label="Update" @click="save" />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
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

    <!-- Maintenance Modal component -->
    <MaintenanceSchedulesModal ref="maintModal" @changed="onMaintChanged" />

    <!-- Chat Dialog -->
    <Dialog v-model:visible="chatDialogVisible" modal header="Report Chat" :style="{ width: '700px' }">
      <ChatRoom v-if="chatTarget?.token" :issueToken="chatTarget.token" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, watchEffect } from "vue";
import { useToast } from "primevue/usetoast";
import {
  listIssueReports,
  updateIssueReport,
  deleteIssueReport,
} from "@/utils/backend_helper";
import {
  getIssueUnreadCounts,
  getIssueMessageRead,
  listIssueMessages,
  getIssueTitleSuggestions,
} from "@/utils/backend_helper";
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

const categoryFilter = ref(null);
const statusFilter = ref(null);
const titleQuery = ref("");
const titleSuggestions = ref([]);
const showTitleSuggestions = ref(false);
const suggestionsLoaded = ref(false);
const suggestionsLoading = ref(false);
const suggestionsError = ref(false);

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
  return list;
});

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
    await refreshUnread();
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
  const onInvalidate = async () => { await refreshUnread(); };
  const onConnect = () => {
    if (unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
    // Ensure a fresh fetch on connect
    void refreshUnread();
  };
  const onDisconnect = () => {
    if (!unreadTimer) unreadTimer = setInterval(refreshUnread, 5000);
  };
  // attach listeners
  socket.on('unread:invalidate', onInvalidate);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  // If not yet connected, keep polling until connected
  if (!socket.connected && !unreadTimer) unreadTimer = setInterval(refreshUnread, 5000);

  // Cleanup on unmount
  onUnmounted(() => {
    if (unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
    try {
      socket.off('unread:invalidate', onInvalidate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
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
        if (typeof r?.title === 'string' && r.title.toLowerCase().includes(q.toLowerCase())) set.add(r.title);
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
const rowMenu = ref();            // <Menu> ref
const rowMenuItems = ref([]);     // dynamic items per row
const activeRow = ref(null);      // keep track of which row is active

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
  ];
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
</style>
