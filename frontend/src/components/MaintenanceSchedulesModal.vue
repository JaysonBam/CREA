<template>
  <!-- This is the component that is used in Report.vue -->
  <Dialog
    v-model:visible="visible"
    modal
    :style="{ width: '860px' }"
    :header="`Maintenance — ${issueTitle || ''}`"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="text-lg font-semibold">Maintenance — {{ issueTitle || '' }}</div>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-plus" label="New" @click="openNew" />
          <Button icon="pi pi-refresh" text rounded @click="load" />
        </div>
      </div>
    </template>

    <DataTable
      :value="rows"
      dataKey="token"
      :loading="loading"
      :paginator="true"
      :rows="8"
      showGridlines
      class="mb-2"
    >
      <template #empty>No schedules yet.</template>
      <template #loading>Loading…</template>

      <Column header="#" style="min-width: 4rem">
        <template #body="slotProps">{{ rows.indexOf(slotProps.data) + 1 }}</template>
      </Column>

      <Column field="description" header="Description" style="min-width: 18rem">
        <template #body="{ data }">{{ data.description }}</template>
      </Column>

      <Column field="date_time_from" header="From" style="min-width: 14rem">
        <template #body="{ data }">{{ fmt(data.date_time_from) }}</template>
      </Column>

      <Column field="date_time_to" header="To" style="min-width: 14rem">
        <template #body="{ data }">{{ fmt(data.date_time_to) }}</template>
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

    <template #footer>
      <Button label="Close" outlined @click="visible = false" />
    </template>
  </Dialog>

  <!-- Create/Edit form -->
  <Dialog
    v-model:visible="formVisible"
    modal
    :header="isEdit ? 'Edit Maintenance' : 'New Maintenance'"
    :style="{ width: '36rem' }"
  >
    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-sm mb-1">Description</label>
        <Textarea v-model.trim="form.description" autoResize rows="3" class="w-full" :invalid="!!errors.description" />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm mb-1">From</label>
          <Calendar
            v-model="form.date_time_from"
            showTime
            hourFormat="24"
            showIcon
            class="w-full"
            :touchUI="true"
            :manualInput="true"
            :invalid="!!errors.date_time_from"
          />
          <small v-if="errors.date_time_from" class="text-red-500">{{ errors.date_time_from }}</small>
        </div>
        <div>
          <label class="block text-sm mb-1">To</label>
          <Calendar
            v-model="form.date_time_to"
            showTime
            hourFormat="24"
            showIcon
            class="w-full"
            :touchUI="true"
            :manualInput="true"
            :invalid="!!errors.date_time_to"
          />
          <small v-if="errors.date_time_to" class="text-red-500">{{ errors.date_time_to }}</small>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" outlined @click="formVisible = false" />
      <Button :label="isEdit ? 'Update' : 'Create'" @click="save" />
    </template>
  </Dialog>

  <!-- Delete confirm -->
  <Dialog v-model:visible="deleteVisible" modal header="Confirmation" :style="{ width: '350px' }">
    <div class="flex items-center justify-center gap-4">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem" />
      <span>Delete this maintenance schedule?</span>
    </div>
    <template #footer>
      <Button label="No" icon="pi pi-times" text severity="secondary" @click="deleteVisible = false" />
      <Button label="Yes" icon="pi pi-check" outlined severity="danger" @click="deleteConfirmed" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useToast } from "primevue/usetoast";
import {
  listMaintenanceSchedules,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from "@/utils/backend_helper";

const toast = useToast();

const visible = ref(false);
const issueToken = ref("");
const issueTitle = ref("");

const rows = ref([]);
const loading = ref(false);

const formVisible = ref(false);
const isEdit = ref(false);
//The fields the form should submit
const form = reactive({
  token: "",
  description: "",
  date_time_from: null, 
  date_time_to: null,
});
const errors = reactive({
  description: "",
  date_time_from: "",
  date_time_to: "",
});

// Delete state
const deleteVisible = ref(false);
const deleteTarget = ref(null);

// Expose a simple open(issue) to parent
function open(issue) {
  issueToken.value = issue?.token || "";
  issueTitle.value = issue?.title || "";
  visible.value = true;
  load();
}
defineExpose({ open });

//Helper functions
function fmt(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(+d) ? "" : d.toLocaleString();
}
function clearErrors() {
  errors.description = "";
  errors.date_time_from = "";
  errors.date_time_to = "";
}
//Validation
function validate() {
  clearErrors();
  let ok = true;
  if (!form.description?.trim()) {
    errors.description = "Description is required";
    ok = false;
  }
  if (!form.date_time_from) {
    errors.date_time_from = "Start date/time is required";
    ok = false;
  }
  if (!form.date_time_to) {
    errors.date_time_to = "End date/time is required";
    ok = false;
  }
  if (form.date_time_from && form.date_time_to) {
    const from = new Date(form.date_time_from);
    const to = new Date(form.date_time_to);
    if (to < from) {
      errors.date_time_to = "End must be after start";
      ok = false;
    }
  }
  return ok;
}
//Show for the maintenanceSchedules in the modal
async function load() {
  if (!issueToken.value) { rows.value = []; return; }
  loading.value = true;
  try {
    const { data } = await listMaintenanceSchedules(issueToken.value);
    rows.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({ severity: "error", summary: "Load failed", detail: e?.response?.data?.error || e.message, life: 3500 });
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function openNew() {
  Object.assign(form, { token: "", description: "", date_time_from: null, date_time_to: null });
  isEdit.value = false;
  clearErrors();
  formVisible.value = true;
}

function openEdit(row) {
  Object.assign(form, {
    token: row.token,
    description: row.description || "",
    date_time_from: new Date(row.date_time_from),
    date_time_to: new Date(row.date_time_to),
  });
  isEdit.value = true;
  clearErrors();
  formVisible.value = true;
}

async function save() {
  if (!validate()) {
    toast.add({ severity: "warn", summary: "Validation", detail: "Fix highlighted fields.", life: 2500 });
    return;
  }

  try {
    if (isEdit.value && form.token) {
      //Update Maintenance Schedules
      await updateMaintenanceSchedule(form.token, {
        description: form.description.trim(),
        date_time_from: new Date(form.date_time_from).toISOString(),
        date_time_to: new Date(form.date_time_to).toISOString(),
      });
      toast.add({ severity: "success", summary: "Updated", life: 1500 });
    } else {
       //Create Maintenance Schedules
      await createMaintenanceSchedule({
        issueToken: issueToken.value,
        description: form.description.trim(),
        date_time_from: new Date(form.date_time_from).toISOString(),
        date_time_to: new Date(form.date_time_to).toISOString(),
      });
      toast.add({ severity: "success", summary: "Created", life: 1500 });
    }
    formVisible.value = false;
    await load();
    emitChanged();
  } catch (e) {
    toast.add({ severity: "error", summary: "Save failed", detail: e?.response?.data?.error || e.message, life: 3500 });
  }
}

function confirmDelete(row) {
  deleteTarget.value = row;
  deleteVisible.value = true;
}
//Make sure you really want to delete the maintenanceSchedule
async function deleteConfirmed() {
  if (!deleteTarget.value?.token) return;
  try {
    await deleteMaintenanceSchedule(deleteTarget.value.token);
    toast.add({ severity: "success", summary: "Deleted", life: 1500 });
    await load();
    emitChanged();
  } catch (e) {
    toast.add({ severity: "error", summary: "Delete failed", detail: e?.response?.data?.error || e.message, life: 3500 });
  } finally {
    deleteVisible.value = false;
    deleteTarget.value = null;
  }
}

const emit = defineEmits(["changed"]);
function emitChanged() { emit("changed"); }
</script>

<style scoped>
.text-red-500 { color: var(--red-500); }
</style>
