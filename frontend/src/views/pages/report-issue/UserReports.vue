<template>
  <div class="card">
    <Toast />
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">My Reported Issues</h1>

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
            <div class="flex justify-between items-start">
              <span class="truncate">{{ report.title }}</span>
              <Tag :value="report.status" :severity="getStatusSeverity(report.status)" />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import {
  getUserReports,
  updateIssueReport,
  createFileAttachment
} from "@/utils/backend_helper";

const reports = ref([]);
const loading = ref(true);
const toast = useToast();

const showEditDialog = ref(false);
const showUploadDialog = ref(false);
const currentReport = reactive({
  id: null,
  token: null,
  title: "",
  description: "",
});

const loadReports = async () => {
  loading.value = true;
  try {
    const userToken = sessionStorage.getItem("token");
    if (!userToken) {
      toast.add({ severity: "error", summary: "Authentication Error", detail: "User token not found.", life: 3000 });
      loading.value = false;
      return;
    }
    const { data } = await getUserReports(userToken);
    reports.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({ severity: "error", summary: "Failed to load reports", detail: e.message, life: 3000 });
  } finally {
    loading.value = false;
  }
};

const openEditDialog = (report) => {
  Object.assign(currentReport, {
    id: report.id,
    token: report.token,
    title: report.title,
    description: report.description,
  });
  showEditDialog.value = true;
};

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

const openUploadDialog = (report) => {
  Object.assign(currentReport, report);
  showUploadDialog.value = true;
};

// Custom upload handler using backend_helper
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

onMounted(loadReports);
</script>

<style scoped>
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}
</style>
