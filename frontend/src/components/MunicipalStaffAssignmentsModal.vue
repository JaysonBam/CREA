<template>
  <Dialog v-model:visible="visible" modal :style="{ width: '880px' }">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="text-lg font-semibold">Assign Staff — {{ issueTitle || '' }}</div>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-plus" label="Add" @click="openNew" />
          <Button icon="pi pi-refresh" text rounded @click="load" />
        </div>
      </div>
    </template>

    <DataTable :value="rows" dataKey="token" :loading="loading" :paginator="true" :rows="8" showGridlines class="mb-2">
      <template #empty>No staff assignments yet.</template>
      <template #loading>Loading…</template>

      <Column header="#" style="min-width:4rem">
        <template #body="slotProps">{{ rows.indexOf(slotProps.data) + 1 }}</template>
      </Column>

      <Column header="Name" style="min-width:16rem">
        <template #body="{ data }">
          {{ fullName(data.staff?.User) }}
        </template>
      </Column>

      <Column header="Email" style="min-width:16rem">
        <template #body="{ data }">{{ data.staff?.User?.email || '—' }}</template>
      </Column>

      <Column header="Job" style="min-width:14rem">
        <template #body="{ data }">{{ data.staff?.job_description || '—' }}</template>
      </Column>

      <Column field="note" header="Note" style="min-width:18rem">
        <template #body="{ data }">{{ data.note || '—' }}</template>
      </Column>

      <Column header="Actions" style="min-width:12rem">
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

  <!-- Create/Edit -->
  <Dialog v-model:visible="formVisible" modal :header="isEdit ? 'Edit Assignment' : 'New Assignment'" :style="{ width: '36rem' }">
    <div class="flex flex-col gap-3">
      <div v-if="!isEdit">
        <label class="block text-sm mb-1">Municipal Staff</label>
        <Dropdown
          v-model="form.municipalStaffToken"
          :options="eligible"
          optionLabel="__label"
          optionValue="token"
          class="w-full"
          placeholder="Select staff (same ward)"
          :loading="eligibleLoading"
          :filter="true"
        />
        <small v-if="errors.municipalStaffToken" class="text-red-500">{{ errors.municipalStaffToken }}</small>
      </div>

      <div>
        <label class="block text-sm mb-1">Note</label>
        <Textarea v-model.trim="form.note" autoResize rows="3" class="w-full" />
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
      <span>Remove this staff assignment?</span>
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
  listIssueStaffAssignments,
  listEligibleStaffForIssue,
  addIssueStaffAssignment,
  updateIssueStaffAssignment,
  deleteIssueStaffAssignment,
} from "@/utils/backend_helper";

const toast = useToast();

const visible = ref(false);
const issueToken = ref("");
const issueTitle = ref("");
const rows = ref([]);
const loading = ref(false);

// eligible staff for create
const eligible = ref([]);
const eligibleLoading = ref(false);

// form
const formVisible = ref(false);
const isEdit = ref(false);
const form = reactive({
  token: "",                // assignment token (edit)
  municipalStaffToken: "",  // staff token (create)
  note: "",
});
const errors = reactive({ municipalStaffToken: "" });

// delete
const deleteVisible = ref(false);
const deleteTarget = ref(null);

function fullName(u) {
  if (!u) return "—";
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || "—";
}

function clearForm() {
  form.token = "";
  form.municipalStaffToken = "";
  form.note = "";
  errors.municipalStaffToken = "";
}

function open(issue) {
  issueToken.value = issue?.token || "";
  issueTitle.value = issue?.title || "";
  visible.value = true;
  load();
}
defineExpose({ open });

async function load() {
  if (!issueToken.value) { rows.value = []; return; }
  loading.value = true;
  try {
    const { data } = await listIssueStaffAssignments(issueToken.value);
    rows.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({ severity: "error", summary: "Load failed", detail: e?.response?.data?.error || e.message, life: 3500 });
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadEligible() {
  eligibleLoading.value = true;
  try {
    const { data } = await listEligibleStaffForIssue(issueToken.value);
    const list = Array.isArray(data) ? data : [];
    // make combined label for dropdown
    eligible.value = list.map(s => ({
      ...s,
      __label: `${s?.User?.first_name || ""} ${s?.User?.last_name || ""} (${s?.User?.email || "no-email"})`.trim(),
    }));
  } catch (e) {
    eligible.value = [];
  } finally {
    eligibleLoading.value = false;
  }
}

function openNew() {
  clearForm();
  isEdit.value = false;
  formVisible.value = true;
  loadEligible();
}

function openEdit(row) {
  clearForm();
  form.token = row.token;
  form.note = row.note || "";
  isEdit.value = true;
  formVisible.value = true;
}

async function save() {
  try {
    if (isEdit.value) {
      await updateIssueStaffAssignment(form.token, { note: form.note || null });
      toast.add({ severity: "success", summary: "Updated", life: 1500 });
    } else {
      if (!form.municipalStaffToken) {
        errors.municipalStaffToken = "Select a staff member";
        return;
      }
      await addIssueStaffAssignment(issueToken.value, {
        municipalStaffToken: form.municipalStaffToken,
        note: form.note || null,
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

async function deleteConfirmed() {
  if (!deleteTarget.value?.token) return;
  try {
    await deleteIssueStaffAssignment(deleteTarget.value.token);
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
