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
      :value="rows"
      v-model:filters="filters"
      dataKey="id"
      :loading="loading"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 25]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} issue reports"
      :globalFilterFields="['title', 'description', 'category', 'status']"
      responsiveLayout="scroll"
    >
      <template #header>
        <div class="flex flex-col gap-2 text-left md:flex-row md:items-center md:justify-between">
          <h5 class="m-0 text-xl font-semibold">Manage Issue Reports</h5>
          <div class="flex items-center gap-2">
            <Button
              text
              plain
              rounded
              icon="pi pi-filter-slash"
              @click="clearFilter"
            />
            <span class="relative">
              <i class="pi pi-search absolute top-2/4 -mt-2 left-3 text-surface-400 dark:text-surface-600" />
              <InputText
                v-model="filters['global'].value"
                placeholder="Search..."
                class="pl-10 font-normal"
              />
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
          {{ data.title }}
        </template>
      </Column>

      <Column
        field="category"
        header="Category"
        :sortable="true"
        style="min-width: 10rem"
        :showFilterMatchModes="false"
      >
        <template #body="{ data }">
          {{ data.category }}
        </template>
        <template #filter="{ filterModel }">
          <Dropdown
            v-model="filterModel.value"
            :options="categoryOptions"
            placeholder="Any"
            class="p-column-filter"
            :showClear="true"
          >
          </Dropdown>
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
         <template #filter="{ filterModel }">
          <Dropdown
            v-model="filterModel.value"
            :options="statusOptions"
            placeholder="Any"
            class="p-column-filter"
            :showClear="true"
          >
          </Dropdown>
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
         <div class="field" v-if="isEdit">
          <label for="status">Status</label>
           <Dropdown
            id="status"
            v-model="form.status"
            :options="statusOptions"
            placeholder="Select a Status"
          >
          </Dropdown>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode } from "@primevue/core/api";
import {
  listIssueReports,
  getIssueReport,
  getUserIssueReports,
  createIssueReport,
  updateIssueReport,
  deleteIssueReport,
} from "@/utils/backend_helper"; // <-- IMPORTANT: UPDATE THIS PATH AND FUNCTIONS

const rows = ref([]);
const loading = ref(false);

const makeEmptyFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  title: { value: null, matchMode: FilterMatchMode.CONTAINS },
  category: { value: null, matchMode: FilterMatchMode.EQUALS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
});

const filters = ref(makeEmptyFilters());
const categoryOptions = ref(['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER']);
const statusOptions = ref(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED']);

const getStatusSeverity = (status) => {
  switch (status) {
    case 'RESOLVED': return 'success';
    case 'IN_PROGRESS': return 'warning';
    case 'ACKNOWLEDGED': return 'info';
    case 'NEW': return 'primary';
    default: return 'secondary';
  }
};

const clearFilter = () => {
  filters.value = makeEmptyFilters();
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

/* ---------------------------------------------------------- */
const load = async () => {
  loading.value = true;
  console.log("Loading user reports");
  try {
    console.log("Token:", sessionStorage.getItem("token"));
    const { data } = await getUserIssueReports(sessionStorage.getItem("token"));
    rows.value = Array.isArray(data) ? data : [];
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

onMounted(load);
</script>