<template>
  <Toast />

  <div class="card">
    <div class="font-semibold text-xl mb-4">TestCrud (filterable)</div>

    <DataTable
      :value="rows"
      :paginator="true"
      :rows="10"
      dataKey="token"
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

      <!-- Auto-numbered row -->
      <Column header="#" style="min-width: 4rem">
        <template #body="slotProps">
          {{ rows.indexOf(slotProps.data) + 1 }}
        </template>
      </Column>

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
            <Button size="small" icon="pi pi-trash" label="Delete" severity="danger" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- Create/Edit Modal -->
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

  <!-- Delete Confirmation Dialog -->
  <Dialog v-model:visible="deleteDialogVisible" modal header="Confirmation" :style="{ width: '350px' }">
    <div class="flex items-center justify-center gap-4">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem" />
      <span>Are you sure you want to delete this record?</span>
    </div>
    <template #footer>
      <Button label="No" icon="pi pi-times" text severity="secondary" @click="deleteDialogVisible = false" />
      <Button label="Yes" icon="pi pi-check" outlined severity="danger" @click="deleteConfirmed" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import { listTestCrud, createTestCrud, updateTestCrud, deleteTestCrud } from '@/utils/backend_helper';

const rows = ref([]);
const loading = ref(false);

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
const clearFilter = () => { filters.value = makeEmptyFilters(); };

const toast = useToast();

const showDialog = ref(false);
const isEdit = ref(false);
const form = reactive({ token: '', title: '', description: '', isActive: true });
const blank = () => ({ token: '', title: '', description: '', isActive: true });

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
    if (isEdit.value && form.token) {
      await updateTestCrud(form.token, { title: form.title, description: form.description, isActive: form.isActive });
      toast.add({ severity: 'success', summary: 'Updated', life: 1500 });
    } else {
      const { data } = await createTestCrud({ title: form.title, description: form.description, isActive: form.isActive });
      Object.assign(form, data);
      toast.add({ severity: 'success', summary: 'Created', life: 1500 });
    }
    showDialog.value = false;
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: e?.response?.data?.error || e.message, life: 3500 });
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
    await deleteTestCrud(deleteTarget.value.token);
    toast.add({ severity: 'success', summary: 'Deleted', life: 1500 });
    await load();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Delete failed', detail: e.message, life: 3500 });
  } finally {
    deleteDialogVisible.value = false;
    deleteTarget.value = null;
  }
};
/* ---------------------------------------------------------- */

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
</script>

<style scoped>
code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
</style>
