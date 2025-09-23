<template>
  <div class="card">
    <Toast />
    <div class="p-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 class="text-2xl font-bold">My Reported Issues</h1>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-filter-slash" text rounded @click="clearFilters" />
          <Dropdown v-model="categoryFilter" :options="categoryOptions" placeholder="Any Category" class="w-44" :showClear="true" @change="loadReports" />
          <Dropdown v-model="statusFilter" :options="statusOptions" placeholder="Any Status" class="w-44" :showClear="true" @change="loadReports" />
          <div class="relative">
            <InputText v-model="titleQuery" placeholder="Search title..." class="w-64" @input="onTitleInput" />
            <ul v-if="showTitleSuggestions && titleSuggestions.length" class="absolute z-10 mt-1 w-full bg-white border rounded shadow text-sm max-h-56 overflow-auto">
              <li v-for="t in titleSuggestions" :key="t" class="px-3 py-2 hover:bg-surface-100 cursor-pointer" @click="applyTitleSuggestion(t)">{{ t }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-16">
        <ProgressSpinner />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!reports.length"
        class="text-center py-16 border-2 border-dashed border-surface-200 rounded-lg"
      >
        <i class="pi pi-inbox text-5xl text-surface-400"></i>
        <p class="mt-4 text-lg text-surface-500">
          You haven't reported any issues yet.
        </p>
      </div>

      <!-- Reports Grid -->
      <div v-else class="reports-grid">
        <Card v-for="report in reports" :key="report.token">
          <!-- =================================================================== -->
          <!-- START: IMAGE GALLERY SECTION                                        -->
          <!-- =================================================================== -->
          <template #header>
            <Galleria
              v-if="report.attachments && report.attachments.length"
              :value="report.attachments"
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
          </template>
          <!-- =================================================================== -->
          <!-- END: IMAGE GALLERY SECTION                                          -->
          <!-- =================================================================== -->

          <template #title>
            <div class="flex justify-between items-start gap-2">
              <span class="truncate">{{ report.title }}</span>
              <div class="flex items-center gap-2">
                <span v-if="unread[report.token] > 0" class="unread-chip" :title="`${unread[report.token]} unread`">{{ unread[report.token] }}</span>
                <Tag :value="report.status" :severity="getStatusSeverity(report.status)" />
              </div>
            </div>
          </template>
          <template #subtitle>
            Reported on {{ new Date(report.createdAt).toLocaleDateString() }}
          </template>
          <template #content>
            <p class="m-0 text-surface-700">
              {{ report.description }}
            </p>
          </template>
          <template #footer>
            <div class="flex gap-2 mt-4">
              <Button
                label="Edit Details"
                icon="pi pi-pencil"
                outlined
                class="w-full"
                @click="openEditDialog(report)"
              />
              <Button
                label="Upload Files"
                icon="pi pi-upload"
                severity="secondary"
                outlined
                class="w-full"
                @click="openUploadDialog(report)"
              />
              <span class="relative w-full">
                <Button
                  label="Chat"
                  icon="pi pi-comments"
                  severity="help"
                  outlined
                  class="w-full"
                  @click="openChat(report)"
                />
                <span
                  v-if="unread[report.token] > 0"
                  class="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full px-2 py-0.5 shadow"
                >
                  {{ unread[report.token] }}
                </span>
              </span>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Edit Report Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Edit Issue Report"
      :style="{ width: '500px' }"
      class="p-fluid"
    >
      <div class="flex flex-col gap-6 py-4">
        <div class="field">
          <label for="title" class="font-semibold block mb-2">Title</label>
          <InputText id="title" v-model="currentReport.title" class="w-full" />
        </div>
        <div class="field">
          <label for="description" class="font-semibold block mb-2">Description</label>
          <Textarea
            id="description"
            v-model="currentReport.description"
            :autoResize="true"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showEditDialog = false" />
        <Button label="Save Changes" icon="pi pi-check" @click="saveReport" />
      </template>
    </Dialog>

    <!-- File Upload Dialog -->
    <Dialog
      v-model:visible="showUploadDialog"
      modal
      header="Upload Additional Files"
      :style="{ width: '500px' }"
    >
      <div class="p-4">
        <p class="mb-4">
          Add new photos or documents for report:
          <strong>{{ currentReport.title }}</strong>
        </p>
        <FileUpload
          name="attachments"
          customUpload
          :multiple="true"
          accept="image/*"
          :maxFileSize="5000000"
          @uploader="uploadFiles"
        >
          <template #empty>
            <p>Drag and drop files here to upload.</p>
          </template>
        </FileUpload>
      </div>
    </Dialog>

    <!-- Chat Dialog -->
    <Dialog v-model:visible="showChatDialog" modal header="Report Chat" :style="{ width: '650px' }">
      <ChatRoom v-if="currentReport.token" :issueToken="currentReport.token" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from "vue";
import { useToast } from "primevue/usetoast";
import {
  getUserReports,
  updateIssueReport,
  createFileAttachment
} from "@/utils/backend_helper";
import { getIssueUnreadCounts, getIssueMessageRead, listIssueMessages } from "@/utils/backend_helper";
import { getUserIssueTitleSuggestions } from "@/utils/backend_helper";
import ChatRoom from "@/components/ChatRoom.vue";
import { connectSocket } from "@/utils/socket";

const reports = ref([]);
const loading = ref(true);
const toast = useToast();
const unread = ref({});
let unreadTimer = null;
let socket;

const categoryOptions = ['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER'];
const statusOptions = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];
const categoryFilter = ref(null);
const statusFilter = ref(null);
const titleQuery = ref("");
const titleSuggestions = ref([]);
const showTitleSuggestions = ref(false);

const showEditDialog = ref(false);
const showUploadDialog = ref(false);
const showChatDialog = ref(false);
const currentReport = reactive({
  id: null,
  token: null,
  title: "",
  description: "",
});

// Load the current user's reports with optional filters and refresh unread counts
const loadReports = async () => {
  loading.value = true;
  try {
    const userToken = sessionStorage.getItem("token");
    if (!userToken) {
      toast.add({ severity: "error", summary: "Authentication Error", detail: "User token not found.", life: 3000 });
      loading.value = false;
      return;
    }
    const params = {};
    if (categoryFilter.value) params.category = categoryFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    if (titleQuery.value?.trim()) params.title = titleQuery.value.trim();
    const { data } = await getUserReports(userToken, params);
    reports.value = Array.isArray(data) ? data : [];
    await refreshUnread();
  } catch (e) {
    toast.add({ severity: "error", summary: "Failed to load reports", detail: e.message, life: 3000 });
  } finally {
    loading.value = false;
  }
};

// Refresh unread counts for the user's report tokens
const refreshUnread = async () => {
  try {
    const tokens = reports.value.map(r => r.token);
    if (!tokens.length) { unread.value = {}; return; }
    const { data } = await getIssueUnreadCounts(tokens);
    const counts = data?.counts || {};
    let obj = {};
    for (const t of tokens) obj[t] = counts[t] || 0;
    const allZero = Object.values(obj).every(v => v === 0);
    if (allZero) {
      const currentUserToken = sessionStorage.getItem('token');
      const perToken = await Promise.all(tokens.map(async (t) => {
        try {
          const [{ data: r }, { data: msgs }] = await Promise.all([
            getIssueMessageRead(t),
            listIssueMessages(t),
          ]);
          const last = r?.last_seen_at ? new Date(r.last_seen_at).getTime() : null;
          const list = Array.isArray(msgs) ? msgs : [];
          const cnt = list.filter(m => m?.author?.token !== currentUserToken && (!last || new Date(m.createdAt).getTime() > last)).length;
          return [t, cnt];
        } catch { return [t, 0]; }
      }));
      obj = Object.fromEntries(perToken);
    }
    unread.value = obj;
  } catch (e) {
    // silent fail
  }
};

// Prefill and open the Edit dialog
const openEditDialog = (report) => {
  Object.assign(currentReport, {
    id: report.id,
    token: report.token,
    title: report.title,
    description: report.description,
  });
  showEditDialog.value = true;
};

// Save report title/description edits, then reload list
const saveReport = async () => {
  if (!currentReport.token) return;
  try {
    const payload = {
      title: currentReport.title,
      description: currentReport.description,
    };
    await updateIssueReport(currentReport.token, payload);
    toast.add({ severity: "success", summary: "Success", detail: "Report updated successfully.", life: 3000 });
    showEditDialog.value = false;
    await loadReports();
  } catch (e) {
    toast.add({ severity: "error", summary: "Update Failed", detail: e.message, life: 3000 });
  }
};

// Open the file upload dialog for a report
const openUploadDialog = (report) => {
  Object.assign(currentReport, report);
  showUploadDialog.value = true;
};

// Open Chat dialog and clear local unread chip for that thread
const openChat = (report) => {
  Object.assign(currentReport, report);
  showChatDialog.value = true;
  // Optimistically clear badge; ChatRoom will mark read on bottom
  if (unread.value[report.token] > 0) unread.value[report.token] = 0;
};

// Custom upload handler using backend_helper
// Upload file attachments for the current report
const uploadFiles = async (event) => {
  try {
    const formData = new FormData();
    event.files.forEach(file => {
      formData.append("attachments", file);
    });
    formData.append("issue_report_token", currentReport.token);

    await createFileAttachment(formData);
    toast.add({ severity: "success", summary: "Success", detail: "File(s) uploaded.", life: 3000 });
    showUploadDialog.value = false;
    await loadReports();
  } catch (e) {
    console.error(e);
    toast.add({ severity: "error", summary: "Upload Failed", detail: e.message, life: 3000 });
  }
};

const getStatusSeverity = (status) => {
  switch (status) {
    case 'RESOLVED': return 'success';
    case 'IN_PROGRESS': return 'warning';
    case 'ACKNOWLEDGED': return 'info';
    case 'NEW': return 'primary';
    default: return 'secondary';
  }
};

// Initial load and periodic unread refresh
onMounted(async () => {
  await loadReports();
  socket = connectSocket();
  const onInvalidate = async () => { await refreshUnread(); };
  const onConnect = () => {
    if (unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
    void refreshUnread();
  };
  const onDisconnect = () => {
    if (!unreadTimer) unreadTimer = setInterval(refreshUnread, 5000);
  };
  socket.on('unread:invalidate', onInvalidate);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  if (!socket.connected && !unreadTimer) unreadTimer = setInterval(refreshUnread, 5000);

  onUnmounted(() => {
    if (unreadTimer) { clearInterval(unreadTimer); unreadTimer = null; }
    try {
      socket.off('unread:invalidate', onInvalidate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    } catch {}
  });
});

// note: cleanup handled above

// Clear UI filters and reload user reports
const clearFilters = () => {
  categoryFilter.value = null;
  statusFilter.value = null;
  titleQuery.value = "";
  titleSuggestions.value = [];
  showTitleSuggestions.value = false;
  loadReports();
};

let titleDebounce;
// Debounced title input: fetch suggestions for this user and reload list
const onTitleInput = async () => {
  const q = titleQuery.value?.trim() || "";
  if (titleDebounce) clearTimeout(titleDebounce);
  if (!q) {
    showTitleSuggestions.value = false;
    titleSuggestions.value = [];
    await loadReports();
    return;
  }
  showTitleSuggestions.value = true;
  titleDebounce = setTimeout(async () => {
    try {
      // Build params that respect active filters and current query
      const params = {};
      if (categoryFilter.value) params.category = categoryFilter.value;
      if (statusFilter.value) params.status = statusFilter.value;
      params.title = q;
      const userToken = sessionStorage.getItem("token");
      const { data } = await getUserReports(userToken, params);
      const rowsArr = Array.isArray(data) ? data : [];
      const set = new Set();
      for (const r of rowsArr) {
        if (typeof r?.title === 'string' && r.title.toLowerCase().includes(q.toLowerCase())) set.add(r.title);
        if (set.size >= 10) break;
      }
      titleSuggestions.value = Array.from(set);
    } catch { titleSuggestions.value = []; }
    loadReports();
  }, 250);
};

// Apply a clicked suggestion and reload
const applyTitleSuggestion = (t) => {
  titleQuery.value = t;
  showTitleSuggestions.value = false;
  loadReports();
};

// Auto-reload when dropdown filters change (including clear)
watch(categoryFilter, () => {
  loadReports();
});
watch(statusFilter, () => {
  loadReports();
});
</script>

<style scoped>
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}
.unread-chip { background: var(--primary-500); color: white; border-radius: 9999px; padding: 0 0.5rem; font-size: 0.75rem; }
</style>
