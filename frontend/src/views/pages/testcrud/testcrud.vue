<template>
  <Toast />

  <div class="card">
    <div class="font-semibold text-xl mb-4">TestCrud (filterable)</div>

    <DataTable
      :value="rows"
      :paginator="true"
      :rows="10"
      dataKey="id"
      :rowHover="true"
      v-model:filters="filters"
      filterDisplay="menu"
      :loading="loading"
      :globalFilterFields="['title','description','isActiveText']"
      showGridlines
    >
      <template #header>
        <div class="flex justify-between items-center gap-2">
          <div class="flex gap-2">
            <Button type="button" icon="pi pi-plus" label="New" @click="openNew" />
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

      <Column field="id" header="ID" style="min-width: 6rem" sortable />

      <Column field="title" header="Title" style="min-width: 14rem" sortable>
        <template #body="{ data }">{{ data.title }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search title" />
        </template>
      </Column>

      <Column field="description" header="Description" style="min-width: 18rem">
        <template #body="{ data }">{{ data.description }}</template>
        <template #filter="{ filterModel }">
          <InputText v-model="filterModel.value" placeholder="Search description" />
        </template>
      </Column>

      <Column field="isActive" header="Active" dataType="boolean" style="min-width: 10rem">
        <template #body="{ data }">
          <Tag :value="data.isActive ? 'Yes' : 'No'" :severity="data.isActive ? 'success' : 'danger'" />
        </template>
        <template #filter="{ filterModel }">
          <Select
            v-model="filterModel.value"
            :options="booleanOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Any"
            showClear
            class="w-full"
          />
        </template>
      </Column>

      <Column header="Actions" style="min-width: 12rem">
        <template #body="{ data }">
          <div class="flex gap-2 justify-center">
            <Button size="small" icon="pi pi-pencil" label="Edit" @click="openEdit(data)" />
            <Button size="small" icon="pi pi-trash" label="Delete" severity="danger" @click="remove(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  

  <!-- Modal -->
  <Dialog v-model:visible="showDialog" modal :header="isEdit ? 'Edit Item' : 'New Item'" :style="{ width: '32rem' }">
    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-sm mb-1">Title</label>
        <InputText v-model.trim="form.title" class="w-full" autofocus />
      </div>
      <div>
        <label class="block text-sm mb-1">Description</label>
        <Textarea v-model.trim="form.description" autoResize rows="3" class="w-full" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="form.isActive" binary inputId="active" />
        <label for="active">Active</label>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="showDialog = false" />
      <Button :label="isEdit ? 'Update' : 'Create'" @click="save" />
    </template>

    
  </Dialog>

  <!-- Staff Workload (Row Expansion) -->
<div class="card mt-6">
  <div class="font-semibold text-xl mb-4">Staff & Assigned Report Issues</div>

  <DataTable
    v-model:expandedRows="staffExpandedRows"
    :value="staffRows"
    dataKey="id"
    showGridlines
    tableStyle="min-width: 60rem"
  >
    <template #header>
      <div class="flex flex-wrap justify-end gap-2">
        <Button text icon="pi pi-plus" label="Expand All" @click="expandAllStaff" />
        <Button text icon="pi pi-minus" label="Collapse All" @click="collapseAllStaff" />
      </div>
    </template>

    <Column expander style="width:5rem" />
    <Column field="name" header="Staff Member" />
    <!-- <Column field="role" header="Role" /> -->
    <Column field="workload" header="Workload" />
    <Column header="Status">
      <template #body="{ data }">
        <Tag :value="data.status" :severity="getStaffSeverity(data.status)" />
      </template>
    </Column>

    <template #expansion="{ data }">
      <div class="p-4">
        <h5 class="mb-3">Report Issues for {{ data.name }}</h5>
        <DataTable :value="data.issues" showGridlines>
          <Column field="id" header="Report ID" sortable />
          <Column field="category" header="Category" sortable />
          <Column field="status" header="Status" sortable>
            <template #body="{ data: issue }">
              <Tag :value="issue.status" :severity="getIssueSeverity(issue.status)" />
            </template>
          </Column>
          <Column headerStyle="width:4rem">
            <template #body>
              <Button icon="pi pi-search" text />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </DataTable>
</div>


  
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import { listTestCrud, createTestCrud, updateTestCrud, deleteTestCrud } from '@/utils/backend_helper';

const rows = ref([]);
const loading = ref(false);

// ---- FIX: initialize filters immediately to avoid undefined access & loops
const makeEmptyFilters = () => ({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  title: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
  description: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
  isActive: { value: null, matchMode: FilterMatchMode.EQUALS },
});
const filters = ref(makeEmptyFilters());

const booleanOptions = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];
const clearFilter = () => {
  // reassign a fresh object only when user clicks "Clear"
  filters.value = makeEmptyFilters();
};

const toast = useToast();

// dialog + form
const showDialog = ref(false);
const isEdit = ref(false);
const form = reactive({ id: null, title: '', description: '', isActive: true });

const blank = () => ({ id: null, title: '', description: '', isActive: true });

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
  try {
    if (!form.title?.trim()) {
      toast.add({ severity: 'warn', summary: 'Validation', detail: 'Title is required', life: 2500 });
      return;
    }
    if (isEdit.value) {
      await updateTestCrud(form.id, { title: form.title, description: form.description, isActive: form.isActive });
      toast.add({ severity: 'success', summary: 'Updated', life: 1500 });
    } else {
      await createTestCrud({ title: form.title, description: form.description, isActive: form.isActive });
      toast.add({ severity: 'success', summary: 'Created', life: 1500 });
    }
    showDialog.value = false;
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: e?.response?.data?.error || e.message, life: 3500 });
  }
};

const remove = async (row) => {
  if (!row?.id) return;
  if (!confirm('Delete this item?')) return;
  try {
    await deleteTestCrud(row.id);
    toast.add({ severity: 'success', summary: 'Deleted', life: 1500 });
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Delete failed', detail: e.message, life: 3500 });
  }
};

const load = async () => {
  loading.value = true;
  try {
    const { data } = await listTestCrud();
    rows.value = Array.isArray(data)
      ? data.map((r) => ({ ...r, isActiveText: r.isActive ? 'Yes' : 'No' }))
      : [];
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: e.message, life: 3500 });
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(load);

// Row expansion state + dummy data
const staffExpandedRows = ref([]);

const staffRows = ref([
  {
    id: 101,
    name: 'David James',
    role: 'Technician',
    status: 'Active',
    workload: 3,
    issues: [
      { id: 'RI-1000', category: 'Pothole',     status: 'in progress' },
      { id: 'RI-1001', category: 'Streetlight', status: 'completed'   },
      { id: 'RI-1002', category: 'Sewage',      status: 'pending'     },
    ],
  },
  {
    id: 102,
    name: 'Leon Rodrigues',
    role: 'Electrician',
    status: 'Active',
    workload: 2,
    issues: [
      { id: 'RI-1003', category: 'Streetlight', status: 'in progress' },
      { id: 'RI-1004', category: 'Power',       status: 'pending'     },
    ],
  },
  {
    id: 103,
    name: 'Claire Morrow',
    role: 'Roads',
    status: 'On Leave',
    workload: 0,
    issues: [],
  },
]);

// Expand/Collapse helpers
const expandAllStaff = () => {
  // expand all rows by assigning the array of row objects (uses dataKey)
  staffExpandedRows.value = staffRows.value.map((r) => r);
};
const collapseAllStaff = () => {
  staffExpandedRows.value = [];
};

// Severity helpers for Tag components
const getIssueSeverity = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'in progress') return 'warn';
  if (s === 'pending') return 'info';
  if (s === 'blocked' || s === 'cancelled') return 'danger';
  return undefined;
};

const getStaffSeverity = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'on leave') return 'warn';
  if (s === 'inactive') return 'danger';
  return undefined;
};

</script>

<style scoped>
/* optional tweaks */
</style>
