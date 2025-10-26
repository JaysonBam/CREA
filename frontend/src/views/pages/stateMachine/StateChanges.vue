<template>
  <div class="card">
    <Toast />
    <div class="p-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 class="text-2xl font-bold">My Reported Issues</h1>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-filter-slash" text rounded @click="clearFilters" />
          <Select v-model="categoryFilter" :options="categoryOptions" placeholder="Any Category" class="w-44" :showClear="true" @change="loadReports" />
          <Select v-model="statusFilter" :options="statusOptions" placeholder="Any Status" class="w-44" :showClear="true" @change="loadReports" />
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
          No reports found. Try adjusting your filters.
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
                label="Edit Status"
                icon="pi pi-pencil"
                outlined
                class="w-full"
                @click="openEditDialog(report)"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Edit Status Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      modal
      header="Edit Issue Report"
      :style="{ width: '500px' }"
      class="p-fluid"
    >
      <div class="flex flex-col gap-6 py-4">
        <Select v-model="statusChange" :options="statusOptions" placeholder="Select Status" />
      </div>
      <template #footer>
        <Button label="Cancel" text @click="showEditDialog = false" />
        <Button label="Save Changes" icon="pi pi-check" @click="saveStatusChange" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { useToast } from "primevue/usetoast";
import {
  listIssueReports,
  updateIssueReportStatus
} from "@/utils/backend_helper";

const reports = ref([]);
const loading = ref(true);
const toast = useToast();

const categoryOptions = ['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER'];
const statusOptions = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];
const categoryFilter = ref(null);
const statusFilter = ref(null);
const titleQuery = ref("");
const titleSuggestions = ref([]);
const showTitleSuggestions = ref(false);

const statusChange = ref(null);

const showEditDialog = ref(false);
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
    const { data } = await listIssueReports(params);
    reports.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({ severity: "error", summary: "Failed to load reports", detail: e.message, life: 3000 });
  } finally {
    loading.value = false;
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
  statusChange.value = report.status;
  showEditDialog.value = true;
};

// Save report title/description edits, then reload list
const saveStatusChange = async () => {
  if (!currentReport.token) return;
if (!statusChange.value) {
    toast.add({ severity: "warn", summary: "No Changes", detail: "Please select a new status.", life: 3000 });
    return;
}
  try {
    const payload = {
      from_status: currentReport.status,
      to_status: statusChange.value,
      user_id: sessionStorage.getItem("id"),
      issue_report_id: currentReport.id,
    };
    // await addStatusChange(payload);  // Uncomment when backend endpoint is ready
    await updateIssueReportStatus(currentReport.token, { status: statusChange.value });
    toast.add({ severity: "success", summary: "Success", detail: "Report updated successfully.", life: 3000 });
    showEditDialog.value = false;
    await loadReports();
  } catch (e) {
    toast.add({ severity: "error", summary: "Update Failed", detail: e.message, life: 3000 });
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
      const { data } = await listIssueReports(params);
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
