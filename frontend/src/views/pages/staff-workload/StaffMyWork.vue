<template>
  <div class="card">
    <div class="font-semibold text-xl mb-4">My Work</div>

    <DataTable
      :value="rows"
      :paginator="true"
      :rows="10"
      dataKey="msirToken"
      :rowHover="true"
      v-model:filters="filters"
      filterDisplay="menu"
      :loading="loading"
      :globalFilterFields="[
        'issueTitle',
        'issueDescription',
        'issueCategory',
        'issueStatus',
        'wardName',
        'address',
        'note'
      ]"
      showGridlines
    >
      <template #header>
        <div class="flex justify-between items-center gap-2">
          <div class="flex gap-2">
            <Button type="button" icon="pi pi-refresh" label="Reload" outlined @click="load" />
            <Button type="button" icon="pi pi-filter-slash" label="Clear" outlined @click="clearFilter" />
          </div>
          <IconField>
            <InputIcon><i class="pi pi-search" /></InputIcon>
            <InputText v-model="filters.global.value" placeholder="Keyword Search" />
          </IconField>
        </div>
      </template>

      <template #empty>No records found.</template>
      <template #loading>Loading…</template>

      <Column header="#" style="min-width: 4rem">
        <template #body="slotProps">
          {{ rows.indexOf(slotProps.data) + 1 }}
        </template>
      </Column>

      <Column field="issueTitle" header="Title" style="min-width: 14rem" sortable>
        <template #body="{ data }">{{ data.issueTitle }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search title" />
        </template>
      </Column>

      <Column field="issueDescription" header="Description" style="min-width: 18rem">
        <template #body="{ data }">{{ data.issueDescription }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search description" />
        </template>
      </Column>

      <Column field="issueCategory" header="Category" style="min-width: 10rem" sortable>
        <template #body="{ data }">{{ data.issueCategory }}</template>
        <template #filter="{ filterModel }">
          <Select
            v-model="filterModel.value"
            :options="categoryOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Any"
            showClear
            class="w-full"
          />
        </template>
      </Column>

      <Column field="issueStatus" header="Status" style="min-width: 10rem" sortable>
        <template #body="{ data }">
          <Tag :value="data.issueStatus" :severity="statusSeverity[data.issueStatus] || 'secondary'" />
        </template>
        <template #filter="{ filterModel }">
          <Select
            v-model="filterModel.value"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Any"
            showClear
            class="w-full"
          />
        </template>
      </Column>

      <Column field="wardName" header="Ward" style="min-width: 10rem" sortable>
        <template #body="{ data }">{{ data.wardName || '—' }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search ward" />
        </template>
      </Column>

      <!-- NEW: Address column -->
      <Column field="address" header="Address" style="min-width: 16rem">
        <template #body="{ data }">
          {{ data.address || '—' }}
        </template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search address" />
        </template>
      </Column>

      <Column field="scheduleWindow" header="Next Schedule" style="min-width: 18rem" sortable>
        <template #body="{ data }">
          <span v-if="data.nextScheduleFrom">
            {{ fmt(data.nextScheduleFrom) }} → {{ fmt(data.nextScheduleTo) }}
          </span>
          <span v-else class="opacity-70">No upcoming schedule</span>
        </template>
      </Column>
      <Column field="note" header="Note" style="min-width: 16rem">
        <template #body="{ data }">
          <div class="truncate max-w-64" :title="data.note || ''">{{ data.note || '—' }}</div>
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- Edit Note -->
  <Dialog v-model:visible="showDialog" modal header="Edit Note" :style="{ width: '32rem' }">
    <div class="flex flex-col gap-3">
      <Textarea v-model.trim="editForm.note" autoResize rows="5" class="w-full" />
    </div>
    <template #footer>
      <Button label="Cancel" outlined @click="showDialog = false" />
      <Button label="Save" @click="save" />
    </template>
  </Dialog>

  <!-- Unassign -->
  <Dialog v-model:visible="deleteDialogVisible" modal header="Confirmation" :style="{ width: '350px' }">
    <div class="flex items-center justify-center gap-4">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem" />
      <span>Remove yourself from this assignment?</span>
    </div>
    <template #footer>
      <Button label="No" icon="pi pi-times" text severity="secondary" @click="deleteDialogVisible = false" />
      <Button label="Yes" icon="pi pi-check" outlined severity="danger" @click="deleteConfirmed" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useToast } from "primevue/usetoast";
import { FilterMatchMode, FilterOperator } from "@primevue/core/api";
import { sendToast } from "@/utils/sendToast";
import {
  listIssuesForStaff,
  updateIssueStaffAssignment,
  deleteIssueStaffAssignment,
} from "@/utils/backend_helper";
import api from "@/utils/api";

// Token from /auth/me
const staffToken = ref("");

const toast = useToast();
const rows = ref([]);
const loading = ref(false);

const statusOptions = [
  { label: "NEW", value: "NEW" },
  { label: "ACKNOWLEDGED", value: "ACKNOWLEDGED" },
  { label: "IN_PROGRESS", value: "IN_PROGRESS" },
  { label: "RESOLVED", value: "RESOLVED" },
];

const statusSeverity = {
  NEW: "info",
  ACKNOWLEDGED: "warning",
  IN_PROGRESS: "success",
  RESOLVED: "secondary",
};

const categoryOptions = [
  { label: "POTHOLE", value: "POTHOLE" },
  { label: "WATER_LEAK", value: "WATER_LEAK" },
  { label: "POWER_OUTAGE", value: "POWER_OUTAGE" },
  { label: "STREETLIGHT_FAILURE", value: "STREETLIGHT_FAILURE" },
  { label: "OTHER", value: "OTHER" },
];

const makeEmptyFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  issueTitle: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  issueDescription: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  issueCategory: { value: null, matchMode: FilterMatchMode.EQUALS },
  issueStatus: { value: null, matchMode: FilterMatchMode.EQUALS },
  wardName: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  address: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
  note: {
    operator: FilterOperator.AND,
    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }],
  },
});
const filters = ref(makeEmptyFilters());
const clearFilter = () => (filters.value = makeEmptyFilters());

function fmt(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(+d)) return String(v);
  return d.toLocaleString();
}

const load = async () => {
  // if (!staffToken.value) {
  //   toast.add({ severity: "warn", summary: "Missing token", detail: "No staff token set", life: 2500 });
  //   return;
  // }
  loading.value = true;
  try {
    const { data } = await listIssuesForStaff(staffToken.value);
    const list = Array.isArray(data?.data) ? data.data : [];
    rows.value = list.map((r) => ({
      msirToken: r.msirToken,
      msirCreatedAt: r.msirCreatedAt,
      note: r.note || "",

      issueToken: r.issue?.token,
      issueTitle: r.issue?.title,
      issueDescription: r.issue?.description,
      issueCategory: r.issue?.category,
      issueStatus: r.issue?.status,
      wardName: r.issue?.ward?.name || null,

      // Address from Issue -> Location
      address: r.issue?.location?.address || null,

      nextScheduleFrom: r.nextSchedule?.date_time_from || null,
      nextScheduleTo: r.nextSchedule?.date_time_to || null,
    }));
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Load failed",
      detail: e?.response?.data?.message || e.message,
      life: 3500,
    });
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

// Edit note
const showDialog = ref(false);
const editForm = reactive({ msirToken: "", note: "" });

const openEdit = (row) => {
  editForm.msirToken = row.msirToken;
  editForm.note = row.note || "";
  showDialog.value = true;
};
const save = async () => {
  try {
    await sendToast(toast, updateIssueStaffAssignment(editForm.msirToken, { note: editForm.note || "" }));
    showDialog.value = false;
    await load();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Save failed",
      detail: e?.response?.data?.message || e.message,
      life: 3500,
    });
  }
};

// Unassign
const deleteDialogVisible = ref(false);
const deleteTarget = ref(null);

const confirmDelete = (row) => {
  deleteTarget.value = row;
  deleteDialogVisible.value = true;
};
const deleteConfirmed = async () => {
  if (!deleteTarget.value?.msirToken) return;
  try {
    await sendToast(toast, deleteIssueStaffAssignment(deleteTarget.value.msirToken));
    await load();
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Unassign failed",
      detail: e?.response?.data?.message || e.message,
      life: 3500,
    });
  } finally {
    deleteDialogVisible.value = false;
    deleteTarget.value = null;
  }
};

onMounted(async () => {
  // Get staff token from /auth/me (JWT required)
  const { data } = await api.get("/api/auth/me");
  staffToken.value = data?.user?.municipal_staff_token || "";
  await load();
});
</script>

<style scoped>
.text-red-500 { color: var(--red-500); }

/* Mobile adjustments: stack header, compact table, hide less-important columns */
@media (max-width: 767px) {
  /* Header controls: make search full width and stack buttons */
  .flex.justify-between.items-center.gap-2 {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .flex.gap-2 { display: flex; gap: 0.5rem; }
  :deep(.p-inputtext) { max-width: 100% !important; }

  /* Compact table cells */
  :deep(.p-datatable .p-datatable-tbody > tr > td), :deep(.p-datatable .p-datatable-thead > tr > th) {
    padding: 0.45rem 0.5rem !important;
    font-size: 0.95rem !important;
  }

  /* Hide less-important columns: Description, Address, Next Schedule, Note */
  /* Column order: #, Title, Description, Category, Status, Ward, Address, Next Schedule, Note */
  :deep(.p-datatable-table thead th:nth-child(3)),
  :deep(.p-datatable-table thead th:nth-child(7)),
  :deep(.p-datatable-table thead th:nth-child(8)),
  :deep(.p-datatable-table thead th:nth-child(9)),
  :deep(.p-datatable-table tbody td:nth-child(3)),
  :deep(.p-datatable-table tbody td:nth-child(7)),
  :deep(.p-datatable-table tbody td:nth-child(8)),
  :deep(.p-datatable-table tbody td:nth-child(9)) {
    display: none !important;
  }

  /* Make status tag slightly smaller on mobile */
  :deep(.p-tag) { font-size: 0.85rem !important; padding: 0.25rem 0.4rem !important; }

  /* Dialogs use most of viewport on phones */
  :deep(.p-dialog) { width: 95vw !important; max-width: 680px !important; }
}
</style>
