<template>
  <div class="card">
    <Toast />
    <Toolbar class="mb-4">
      <template #start>
        <div class="my-2">
          <Button
            label="Report New Issue"
            icon="pi pi-plus"
            class="mr-2"
            @click="openNew"
          />
        </div>
      </template>
    </Toolbar>

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
        <div class="py-4 text-center">
          No records found.
        </div>
      </template>
      <template #loading>
        <div class="py-4 text-center">
          Loading…
        </div>
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
            <span v-if="unread[data.token] > 0" class="unread-chip" :title="`${unread[data.token]} unread`">{{ unread[data.token] }}</span>
          </div>
        </template>
      </Column>

      <Column
        field="category"
        header="Category"
        :sortable="true"
        style="min-width: 10rem"
      >
        <template #body="{ data }">
          {{ data.category }}
        </template>
      </Column>

      <Column
        field="status"
        header="Status"
        :sortable="true"
        style="min-width: 10rem"
      >
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>

      <Column
        field="user.email"
        header="Reported By"
        :sortable="true"
        style="min-width: 12rem"
      >
         <template #body="{ data }">
          {{ data.user?.email || 'N/A' }}
        </template>
      </Column>

       <Column
        field="createdAt"
        header="Created At"
        :sortable="true"
        style="min-width: 12rem"
      >
         <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString() }}
        </template>
      </Column>


      <Column :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <Button
            icon="pi pi-pencil"
            outlined
            rounded
            class="mr-2"
            @click="openEdit(slotProps.data)"
          />
          <Button
            icon="pi pi-trash"
            outlined
            rounded
            severity="danger"
            @click="confirmDelete(slotProps.data)"
          />
          <span class="relative inline-block ml-2">
            <Button
              icon="pi pi-comments"
              label="Chat"
              outlined
              rounded
              severity="help"
              @click="openChat(slotProps.data)"
            />
            <span
              v-if="unread[slotProps.data.token] > 0"
              class="absolute -top-2 -right-2 bg-primary-500 text-white text-xs rounded-full px-2 py-0.5 shadow"
            >
              {{ unread[slotProps.data.token] }}
            </span>
          </span>
        </template>
      </Column>
    </DataTable>

    <!-- Create / Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :style="{ width: '450px' }"
      :header="isEdit ? 'Edit Issue Report' : 'Create Issue Report'"
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
           <Dropdown
            id="category"
            v-model="form.category"
            :options="categoryOptions"
            placeholder="Select a Category"
          >
          </Dropdown>
        </div>
        <div class="map-panel">
        <Panel header="3. Upload Attachments (Optional)" class="mt-6">
            <FileUpload
              ref="fileUploader"
              name="attachments"
              :multiple="true"
              :auto="false"
              :customUpload="true"
              @uploader="uploadFiles"
              accept="image/*"
              :maxFileSize="5000000"
              :showUploadButton="false"
              :showCancelButton="false"
              @select="onFileSelect"
              @clear="selectedFiles = []"
            >
              <template #empty>
                <p>Drag and drop files here. Files will be uploaded when you submit the report.</p>
              </template>
            </FileUpload>
          </Panel>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" outlined @click="showDialog = false"></Button>
        <Button :label="isEdit ? 'Update' : 'Create'" @click="save"></Button>
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

    <!-- Chat Dialog -->
    <Dialog v-model:visible="chatDialogVisible" modal header="Report Chat" :style="{ width: '700px' }">
      <ChatRoom v-if="chatTarget?.token" :issueToken="chatTarget.token" />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, watchEffect } from "vue";
import { useToast } from "primevue/usetoast";
import { debounce } from "lodash-es";
import { 
  createLocation, 
  createIssueReport,
  createFileAttachment
 } from "@/utils/backend_helper";

// --- Leaflet Imports ---
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker } from "@vue-leaflet/vue-leaflet";

// UI filter state
const categoryFilter = ref(null);
const statusFilter = ref(null);
const titleQuery = ref("");
const titleSuggestions = ref([]);
const showTitleSuggestions = ref(false);
const suggestionsLoaded = ref(false);
const suggestionsLoading = ref(false);
const suggestionsError = ref(false);
const categoryOptions = ref(['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER']);

const mapLoading = ref(true);
const geocoding = ref(false);
const fileUploader = ref(null); // Ref to access the FileUpload component
const submitting = ref(false);
const selectedFiles = ref([]);
const address = ref("");
const zoom = ref(15);
const mapCenter = ref([-25.7546, 28.2314]); // Default: Pretoria [lat, lng]
const selectedLocation = ref(null); // [lat, lng]

// --- Computed Properties ---
const isFormInvalid = computed(() => {
  return !issueDetails.title || !issueDetails.category || !selectedLocation.value;
});

// Clear UI filters and reload all reports
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

const blank = () => ({
  id: null,
  token: null,
  title: "",
  description: "",
  category: "POTHOLE",
  status: "NEW",
});

const form = reactive(blank());

const openNew = () => {
  Object.assign(form, blank());
  isEdit.value = false;
  showDialog.value = true;
};

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
  
  const payload = {
    title: form.title,
    description: form.description,
    category: form.category,
    status: form.status,
  };

  try {
    if (isEdit.value && form.token) {
      await updateIssueReport(form.token, payload);
      toast.add({ severity: "success", summary: "Updated", detail: "Issue report updated successfully.", life: 1500 });
    } else {
      await createIssueReport(payload);
      toast.add({ severity: "success", summary: "Created", detail: "Issue report created successfully.", life: 1500 });
    }
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

/* ---------------- Delete with custom dialog ---------------- */
const deleteDialogVisible = ref(false);
const deleteTarget = ref(null);
const chatDialogVisible = ref(false);
const chatTarget = ref(null);

const confirmDelete = (row) => {
  deleteTarget.value = row;
  deleteDialogVisible.value = true;
};

const updateLocation = async (posArray) => {
  selectedLocation.value = posArray;
  mapCenter.value = posArray;
  // nextTick ensures the map has recentered before we try to geocode
  await nextTick();
  reverseGeocode(posArray);
};

const handleMarkerDrag = (event) => {
  const latLng = event.target.getLatLng();
  const newPos = [latLng.lat, latLng.lng];
  updateLocation(newPos);
};

const handleMapClick = (event) => {
  const newPos = [event.latlng.lat, event.latlng.lng];
  updateLocation(newPos);
}


const onFileSelect = (event) => {
  console.log("Selected files:", event.files);
  selectedFiles.value = event.files;
};

const uploadFiles = async (event, reportToken) => {
  console.log("Uploading files for report token:", reportToken);
  console.log("Files to upload:", event.files);
  if (!reportToken || !event.files.length) {
    return;
  }
  const formData = new FormData();
  event.files.forEach(file => {
    formData.append("attachments", file);
  });
  formData.append("issue_report_token", reportToken);

  console.log("Uploading files formData:", formData.body);

  try {
    // Use the helper function which handles FormData correctly
    await createFileAttachment(formData);
    toast.add({ severity: 'info', summary: 'Upload Complete', detail: `${event.files.length} file(s) uploaded.`, life: 3000 });
  } catch (uploadError) {
    toast.add({ severity: 'error', summary: 'File Upload Failed', detail: 'Could not upload attachments.', life: 3000 });
  }
};

// --- Form Submission ---
const submitReport = async () => {
  if (isFormInvalid.value) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill all required fields and select a location.', life: 3000 });
    return;
  }
  submitting.value = true;
  try {
    const locationPayload = {
      address: address.value,
      latitude: selectedLocation.value[0], // Use array index 0 for latitude
      longitude: selectedLocation.value[1], // Use array index 1 for longitude
    };
    const { data: newLocation } = await createLocation(locationPayload);
    const reportPayload = {
      ...issueDetails,
      location_id: newLocation.id,
      user_id: sessionStorage.getItem("id"),
    };
    const { data: newReport } = await createIssueReport(reportPayload);
    console.log("Created report:", newReport);
    
    // Step 3: Trigger the file upload process if there are files
    if (selectedFiles.value.length > 0) {
      // Create a temporary object matching the structure the uploader expects
      const uploadEvent = { files: selectedFiles.value };
      await uploadFiles(uploadEvent, newReport.token);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Issue reported successfully!', life: 3000 });
    router.push('/user-reports');
  } catch (e) {
    // silent
  }
};

onMounted(async () => {
  await load();
  unreadTimer = setInterval(refreshUnread, 5000);
});

onUnmounted(() => {
  if (unreadTimer) clearInterval(unreadTimer);
});

// Title search input handlers
let titleDebounce;
let lastSuggestReq = 0;
// Debounced title input: fetch suggestions and reload list; hide on clear
const onTitleInput = async () => {
  const q = titleQuery.value?.trim() || "";
  if (titleDebounce) clearTimeout(titleDebounce);

  // When cleared, hide suggestions and reload full list
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
      const { data } = await getIssueTitleSuggestions(q);
      if (lastSuggestReq !== reqId) return; // stale
      titleSuggestions.value = data?.titles || [];
      suggestionsLoaded.value = true;
      suggestionsLoading.value = false;
    } catch {
      if (lastSuggestReq !== reqId) return; // stale
      titleSuggestions.value = [];
      suggestionsLoaded.value = true;
      suggestionsLoading.value = false;
      suggestionsError.value = true;
    }
    load();
  }, 250);
};

// Apply a clicked suggestion and reload
const applyTitleSuggestion = (t) => {
  titleQuery.value = t;
  showTitleSuggestions.value = false;
  load();
};

// Auto-reload when dropdown filters change (including clear)
watch(categoryFilter, () => {
  load();
  first.value = 0;
});
watch(statusFilter, () => {
  load();
  first.value = 0;
});

// Also reset paginator on title changes for better UX
watchEffect(() => {
  void titleQuery.value;
  first.value = 0;
});
</script>

<style scoped>
.unread-chip { background: var(--primary-500); color: white; border-radius: 9999px; padding: 0 0.5rem; font-size: 0.75rem; }
</style>