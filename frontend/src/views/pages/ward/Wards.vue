<template>
  <div class="card">
    <div class="font-semibold text-xl mb-4">Wards</div>

    <TabView v-model:activeIndex="activeTab">
      <!-- TAB 1: LIST -->
      <TabPanel header="List">
        <DataTable
          :value="visibleRows"
          :paginator="true"
          :rows="10"
          dataKey="token"
          :rowHover="true"
          v-model:filters="filters"
          filterDisplay="menu"
          :loading="loading"
          :globalFilterFields="['name', 'leaderName']"
          showGridlines
        >
          <template #header>
            <div class="flex justify-between items-center gap-2">
              <div class="flex gap-2">
                <Button v-if="isAdmin" type="button" icon="pi pi-plus" label="New" @click="openNew" />
                <Button type="button" icon="pi pi-filter-slash" label="Clear" outlined @click="clearFilter" />
              </div>
              <IconField>
                <InputIcon><i class="pi pi-search" /></InputIcon>
                <InputText v-model="filters['global'].value" placeholder="Search..." />
              </IconField>
            </div>
          </template>

          <Column field="name" header="Ward Name" sortable :showFilterMenu="false" style="width: 14rem">
            <template #body="slotProps">
              <span class="truncate block max-w-56" :title="slotProps.data.name">{{ slotProps.data.name }}</span>
            </template>
          </Column>
          <Column field="leaderName" header="Leader" :showFilterMenu="false" style="width: 12rem" />

          <Column header="Actions" style="width: 18rem">
            <template #body="slotProps">
              <div class="flex gap-2 flex-nowrap">
                <Button icon="pi pi-user" label="View Profile" size="small" outlined @click="goProfile(slotProps.data)" />
                <Button icon="pi pi-chart-line" label="View Stats" size="small" outlined severity="secondary" @click="goStats(slotProps.data)" />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="text-center p-4">No wards found.</div>
          </template>

          <template #loading> Loading wards... </template>
        </DataTable>
      </TabPanel>

      <!-- TAB 2: WARD MANAGEMENT -->
      <TabPanel header="Ward Management" v-if="canSeeWardManagement">
        <div class="grid gap-4">
          <div class="flex items-center gap-2">
            <span class="font-medium">Selected Ward:</span>
            <Dropdown
              class="w-60"
              :options="visibleRows"
              optionLabel="name"
              v-model="manage.selected"
              placeholder="Choose a ward"
              :disabled="loading || !visibleRows.length"
            />
            <Button icon="pi pi-refresh" text @click="loadRows" />
          </div>

          <div v-if="manage.selected" class="surface-card p-4 border-round-md border-1 surface-border">
            <div class="field">
              <label class="font-medium block mb-2" for="m_name">Ward Name</label>
              <InputText id="m_name" v-model.trim="manage.name" placeholder="e.g. Ward 1" />
            </div>

            <div class="field">
              <label class="font-medium block mb-2">Assign Leader</label>
              <Dropdown
                class="w-80"
                :options="leaders"
                optionLabel="fullName"
                optionValue="id"
                v-model="manage.leaderId"
                :loading="leadersLoading"
                placeholder="Select a leader"
                :showClear="true"
              />
              <small v-if="leadersError" class="p-error block mt-2">{{ leadersError }}</small>
            </div>

            <div class="flex gap-2 mt-3">
              <Button :label="saving ? 'Saving...' : 'Save Changes'" :disabled="saving" icon="pi pi-check" @click="saveManage" />
              <Button label="Delete Ward" icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteWard" />
            </div>
          </div>

          <div v-else class="text-600">Pick a ward to manage.</div>
        </div>
      </TabPanel>

      <!-- TAB 3: STAFF MANAGEMENT -->
      <TabPanel header="Staff Management" v-if="canSeeStaffManagement">
        <div class="grid gap-4">
          <div class="flex items-center gap-2">
            <span class="font-medium">Selected Ward:</span>
            <Dropdown
              class="w-60"
              :options="visibleRows"
              optionLabel="name"
              v-model="staff.selected"
              placeholder="Choose a ward"
              :disabled="loading || !visibleRows.length"
            />
            <Button icon="pi pi-refresh" text @click="loadRows" />
          </div>

          <div v-if="staff.selected" class="surface-card p-4 border-round-md border-1 surface-border">
            <div class="field">
              <label class="font-medium block mb-2">Assign Staff Members</label>
              <MultiSelect
                class="w-80"
                :options="staffOptions"
                optionLabel="fullName"
                optionValue="id"
                v-model="staff.memberIds"
                :loading="staffLoading"
                placeholder="Choose staff"
                display="chip"
              />
              <small v-if="staffError" class="p-error block mt-2">{{ staffError }}</small>
            </div>

            <div class="mt-3">
              <div class="flex items-center gap-2 mb-2">
                <div class="font-medium">Currently Assigned</div>
                <Button icon="pi pi-refresh" text size="small" :loading="assignedLoading" @click="reloadAssigned" />
              </div>
              <ul class="list-none pl-3">
                <li v-for="m in staffSummary" :key="m.id" class="mb-2 flex items-center gap-2">
                  <span>• {{ m.fullName }} <span class="text-600">({{ m.email || 'no email' }})</span></span>
                  <Button
                    icon="pi pi-times"
                    size="small"
                    severity="danger"
                    outlined
                    :disabled="savingStaff"
                    @click="removeAssigned(m.id)"
                  />
                </li>
                <li v-if="!staffSummary.length" class="text-600">No staff assigned.</li>
              </ul>
            </div>

            <div class="flex gap-2 mt-3">
              <Button :label="savingStaff ? 'Saving...' : 'Save Staff'" :disabled="savingStaff" icon="pi pi-check" @click="saveStaff" />
            </div>
          </div>

          <div v-else class="text-600">Pick a ward to manage staff.</div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Create / Edit Dialog for quick add -->
    <Dialog v-model:visible="dialogVisible" modal :header="dialogTitle" :style="{ width: '32rem' }">
      <div class="flex flex-col gap-3">
        <div class="field">
          <label class="font-medium block mb-2" for="name">Ward Name</label>
          <InputText id="name" v-model.trim="form.name" placeholder="e.g. Ward 1" />
          <small v-if="v.name" class="p-error">{{ v.name }}</small>
        </div>

        <div class="field flex items-center gap-2">
          <Checkbox inputId="isActive" v-model="form.isActive" :binary="true" />
          <label for="isActive">Active</label>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
        <Button :label="saving ? 'Saving...' : 'Save'" :disabled="saving" icon="pi pi-check" @click="saveRow" />
      </template>
    </Dialog>

    <!-- Delete Confirm -->
    <Dialog v-model:visible="deleteDialog" modal header="Confirm" :style="{ width: '28rem' }">
      <span>Are you sure you want to delete <b>{{ selectedName }}</b>?</span>
      <template #footer>
        <Button label="No" icon="pi pi-times" text @click="deleteDialog = false" />
        <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteRow" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
// --- Access Control ---
const me = ref(null);
const myRole = ref('');
const myWardIds = ref([]); // wards the current user may access explicitly from backend

const isAdmin = computed(() => String(myRole.value || '').toLowerCase() === 'admin');
const isLeader = computed(() => String(myRole.value || '').toLowerCase().replace(/\s|_/g,'') === 'communityleader');
const isResident = computed(() => String(myRole.value || '').toLowerCase() === 'resident');

const canSeeWardManagement = computed(() => isAdmin.value);
const canSeeStaffManagement = computed(() => isAdmin.value || isLeader.value);

// rows the user is allowed to see (admins see all)
const allowedWardIds = computed(() => {
  if (isAdmin.value) return rows.value.map(r => r.id).filter(v => v != null);
  if (Array.isArray(myWardIds.value) && myWardIds.value.length) return myWardIds.value;

  // Derive for leaders from the loaded rows when possible
  if (isLeader.value) {
    const myUserId = me.value?.id || me.value?.user_id || me.value?.token;
    return rows.value
      .filter(r => {
        const lid = r.leaderId ?? r.leader_id ?? r?.leader?.id ?? r?.leader?.user_id;
        return /* eslint-disable eqeqeq */ lid == myUserId /* eslint-enable eqeqeq */;
      })
      .map(r => r.id)
      .filter(v => v != null);
  }

  // Residents
  if (isResident.value) {
    const wid = me.value?.ward_id || me.value?.resident?.ward_id || me.value?.profile?.ward_id;
    return wid != null ? [wid] : [];
  }
  return [];
});

const canSeeRow = (row) => {
  if (isAdmin.value) return true;
  const id = row?.id;
  return allowedWardIds.value.includes(id);
};

const visibleRows = computed(() => rows.value.filter(canSeeRow));

async function fetchMe() {
  // load current user & role
  const tries = ['/api/auth/me', '/api/users/me', '/api/me'];
  for (const p of tries) {
    try {
      const { data } = await api.get(p);
      
      const user = data?.data?.user || data?.user || data?.data || data;
      if (user) {
        me.value = user;
        myRole.value = user.role || user.user_role || user.type || user.position || '';
        break;
      }
    } catch (_) { /* try next */ }
  }

  if (!me.value) {
    const storedRole = sessionStorage.getItem('ROLE') || localStorage.getItem('ROLE');
    if (storedRole) myRole.value = storedRole;
  }

  await fetchMyWardIds();
}

async function fetchMyWardIds() {
  const out = new Set();
  // Resident self endpoint
  try {
    const { data } = await api.get('/api/residents/me');
    const r = data?.data || data;
    const wid = r?.ward_id || r?.wardId;
    if (wid != null) out.add(wid);
  } catch (_) {}

  // Leader self endpoint
  try {
    const { data } = await api.get('/api/community-leaders/me');
    const r = data?.data || data;
    const wid = r?.ward_id || r?.wardId;
    if (wid != null) out.add(wid);
  } catch (_) {}

  myWardIds.value = Array.from(out);
}
import { onMounted, ref, computed, watch } from 'vue'
import api from '@/utils/api'
import { getAllWards, getWard, createWard, updateWard, deleteWard, getWardsWithLeaders } from "@/utils/ward_helper";
import { FilterMatchMode } from '@primevue/core/api'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'

// PrimeVue
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

const toast = useToast()
const router = useRouter()

// ---- Tabs ----
const activeTab = ref(0)

// ---- State (list + CRUD) ----
const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const dialogVisible = ref(false)
const deleteDialog = ref(false)
const selectedRow = ref(null)
const form = ref({ id: null, name: '', isActive: true })
const v = ref({})

const dialogTitle = computed(() => (form.value.id ? 'Edit Ward' : 'New Ward'))

const selectedName = computed(() => {
  if (manage.value?.selected && typeof manage.value.selected === 'object') {
    return manage.value.selected.name || '';
  }
  if (selectedRow.value && typeof selectedRow.value === 'object') {
    return selectedRow.value.name || '';
  }
  return '';
});

// ---- Filters (list tab) ----
const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
})

function clearFilter() {
  filters.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  }
}

// ---- Helpers ----
function leaderDisplay(row) {
  if (row?.leaderName) return row.leaderName;
  if (row?.leader_id && row?.leaderFullName) return row.leaderFullName; // optional prejoined fields
  if (row?.leader?.first_name || row?.leader?.last_name) {
    return `${row.leader.first_name || ''} ${row.leader.last_name || ''}`.trim();
  }
  if (row?.leader?.fullName) return row.leader.fullName;
  return '';
}

function normalize(row) {
  const id = row.id ?? row.ward_id ?? row.token ?? row.uuid ?? null;
  const token = row.token ?? row.id ?? row.ward_id ?? row.uuid ?? null;
  return {
    ...row,
    id,
    token,
    leaderName: leaderDisplay(row),
    isActive: !!row.isActive,
    isActiveText: row.isActive ? 'Yes' : 'No'
  }
}

function openNew() {
  if (!isAdmin.value) { toast.add({ severity: 'warn', summary: 'Permission', detail: 'Only admins can create wards', life: 2500 }); return; }
  v.value = {}
  form.value = { id: null, name: '', isActive: true }
  dialogVisible.value = true
}

function editRow(row) {
  v.value = {}
  form.value = { id: row.id, name: row.name, isActive: !!row.isActive }
  dialogVisible.value = true
}

function hideDialog() {
  dialogVisible.value = false
}

function confirmDeleteRow(row) {
  selectedRow.value = row
  deleteDialog.value = true
}

// ---- API (list + CRUD) ----
async function loadRows() {
  loading.value = true
  try {
    const resp = await getWardsWithLeaders()
    const list = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : []
    rows.value = list.map(normalize)
    // Enforce client-side visibility immediately after load
    if (!isAdmin.value) {
      rows.value = rows.value.filter(canSeeRow);
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Load failed', detail: getErr(err), life: 4000 })
  } finally {
    loading.value = false
  }
}

function validate() {
  const errs = {}
  if (!form.value.name) errs.name = 'Ward name is required'
  v.value = errs
  return Object.keys(errs).length === 0
}

async function saveRow() {
  if (!validate()) return
  if (!isAdmin.value) { toast.add({ severity: 'warn', summary: 'Permission', detail: 'Only admins can save ward changes', life: 2500 }); return; }
  saving.value = true
  try {
    if (form.value.id) {
      await api.put(`/api/wards/${form.value.id}`, {
        name: form.value.name,
        isActive: form.value.isActive
      })
      toast.add({ severity: 'success', summary: 'Updated', detail: 'Ward updated', life: 2500 })
    } else {
      await api.post('/api/wards', {
        name: form.value.name,
        isActive: form.value.isActive
      })
      toast.add({ severity: 'success', summary: 'Created', detail: 'Ward created', life: 2500 })
    }
    dialogVisible.value = false
    await loadRows()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: getErr(err), life: 4000 })
  } finally {
    saving.value = false
  }
}

async function deleteRow() {
  if (!isAdmin.value) { toast.add({ severity: 'warn', summary: 'Permission', detail: 'Only admins can delete wards', life: 2500 }); return; }
  const id =
    manage.value?.selected?.id ||
    selectedRow.value?.id ||
    manage.value?.selectedId ||
    staff.value?.selectedId;

  if (!id) {
    toast.add({ severity: 'warn', summary: 'Delete', detail: 'No ward selected to delete', life: 2500 });
    return;
  }
  try {
    await api.delete(`/api/wards/${id}`);
    toast.add({ severity: 'success', summary: 'Deleted', detail: 'Ward removed', life: 2500 });
    deleteDialog.value = false;
    selectedRow.value = null;
    manageReset();
    await loadRows();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Delete failed', detail: getErr(err), life: 4000 });
  }
}

function getErr(err) {
  if (err?.response?.data?.message) return err.response.data.message
  if (err?.response?.status) return `HTTP ${err.response.status}`
  return err?.message || 'Unknown error'
}

// ---- Navigation actions (List tab) ----
async function goProfile(row) {
  if (row && !canSeeRow(row)) { toast.add({ severity: 'warn', summary: 'Access denied', detail: 'You cannot open this ward', life: 2500 }); return; }
  const id = row?.id
  if (!id) {
    toast.add({ severity: 'warn', summary: 'Profile', detail: 'No ward id found', life: 2500 })
    return
  }
  try {
    // Prefer named route if it exists
    await router.push({ name: 'WardProfile', params: { wardId: id } })
  } catch {
    // Fallback 
    try {
      await router.push(`/wards/${id}/profile`)
    } catch (e) {
      toast.add({ severity: 'error', summary: 'Navigation failed', detail: getErr(e), life: 4000 })
    }
  }
}

async function goStats(row) {
  if (row && !canSeeRow(row)) { toast.add({ severity: 'warn', summary: 'Access denied', detail: 'You cannot open this ward', life: 2500 }); return; }
  const id = row?.id
  if (!id) {
    toast.add({ severity: 'warn', summary: 'Stats', detail: 'No ward id found', life: 2500 })
    return
  }
  try {
    // Prefer named route if it exists
    await router.push({ name: 'WardStats', params: { wardId: id } })
  } catch {
    // Fallback 
    try {
      await router.push(`/wards/${id}/stats`)
    } catch (e) {
      toast.add({ severity: 'error', summary: 'Navigation failed', detail: getErr(e), life: 4000 })
    }
  }
}

function openManage(row) {
  activeTab.value = 1
  manage.value.selected = row
}

// ---- Ward Management tab ----
const manage = ref({
  selected: null,
  selectedId: null,
  name: '',
  leaderId: null
})

const leaders = ref([])
const leadersLoading = ref(false)
const leadersError = ref('')

async function fetchLeaders() {
  leadersLoading.value = true
  leadersError.value = ''
  try {
    const { data } = await api.get('/api/users', { params: { role: 'communityleader' } })
    const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []

    // Accept various role shapes from backend and keep only community leaders
    const onlyLeaders = raw.filter((u) => {
      const rolesArr = Array.isArray(u?.roles)
        ? u.roles.map(r => (typeof r === 'string' ? r : (r?.name || r?.role || '')))
        : []
      const roleStrs = [u?.role, u?.user_role, u?.type, u?.position]
        .filter(Boolean)
        .map(r => String(r))
      const allRoles = rolesArr.concat(roleStrs).map(r => r.toLowerCase())
      return allRoles.includes('communityleader') || allRoles.includes('community_leader')
    })

    
    const seen = new Map()
    for (const u of onlyLeaders) {
      const id = u.id || u.user_id || u.token
      if (!seen.has(id)) seen.set(id, u)
    }

    const list = Array.from(seen.values()).map(u => ({
      id: u.id || u.user_id || u.token,
      fullName: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.fullName || u.name || u.email || 'Unknown',
      email: u.email || ''
    }))

    // Sort A->Z by name
    leaders.value = list.sort((a, b) => a.fullName.localeCompare(b.fullName))
  } catch (e) {
    leadersError.value = getErr(e)
    leaders.value = []
  } finally {
    leadersLoading.value = false
  }
}

function manageReset() {
  manage.value = { selected: null, selectedId: null, name: '', leaderId: null }
}

async function saveManage() {
  if (!isAdmin.value) { toast.add({ severity: 'warn', summary: 'Permission', detail: 'Only admins can change ward details', life: 2500 }); return; }
  const mv = manage.value;
  if (!mv.selected) {
    toast.add({ severity: 'warn', summary: 'Save', detail: 'Pick a ward first', life: 2000 });
    return;
  }
  const newName = (mv.name || '').trim();
  if (!newName) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Ward name is required', life: 2500 });
    return;
  }

  saving.value = true;
  try {
    // 1) Update basic ward fields
    await api.put(`/api/wards/${mv.selected.id}`, {
      name: newName,
      isActive: !!mv.selected.isActive,
    });

    // 2) Assign/Update/REMOVE leader
    {
      const ok = await assignLeader(mv.selected.id, mv.leaderId);
      if (!ok && mv.leaderId != null) {
        try {
          await api.put(`/api/wards/${mv.selected.id}`, { leader_id: mv.leaderId });
        } catch (_) {
          await api.put(`/api/wards/${mv.selected.id}`, { leaderId: mv.leaderId });
        }
      }
    }

    toast.add({ severity: 'success', summary: 'Saved', detail: 'Ward changes saved', life: 2500 });
    await loadRows();

    // Reselect the updated ward so dropdown & fields stay in sync
    mv.selected = rows.value.find(x => x.id === (mv.selectedId || mv.selected?.id)) || null;
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: getErr(err), life: 4000 });
  } finally {
    saving.value = false;
  }
}
/**
 * Best-effort leader assignment that tries common backend patterns.
 * Returns true if any attempt succeeds.
 * Supports clearing leader if leaderId is null.
 */
async function assignLeader(wardId, leaderId) {
  // If clearing the leader
  if (leaderId == null) {
    // Try a dedicated DELETE first
    try {
      await api.delete(`/api/wards/${wardId}/leader`)
      return true
    } catch (_) {}

    // Some backends accept POST with empty body to clear
    try {
      await api.post(`/api/wards/${wardId}/leader`, {})
      return true
    } catch (_) {}

    // Try deleting from a join/assignment collection
    try {
      await api.delete(`/api/community-leaders/${wardId}`)
      return true
    } catch (_) {}

    // Fallback: send explicit nulls to a PUT ward endpoint
    try {
      await api.put(`/api/wards/${wardId}`, { leader_id: null })
      return true
    } catch (_) {
      try {
        await api.put(`/api/wards/${wardId}`, { leaderId: null })
        return true
      } catch (_) {}
    }

    return false
  }

  // Otherwise assign a leader (non-null)
  try {
    await api.post(`/api/wards/${wardId}/leader`, { leaderId })
    return true
  } catch (_) {}

  try {
    await api.post(`/api/wards/${wardId}/leader`, { leader_id: leaderId })
    return true
  } catch (_) {}

  try {
    await api.post(`/api/community-leaders`, { ward_id: wardId, user_id: leaderId })
    return true
  } catch (_) {}

  try {
    await api.put(`/api/community-leaders/${wardId}`, { user_id: leaderId })
    return true
  } catch (_) {}

  return false
}

function confirmDeleteWard() {
  selectedRow.value = manage.value.selected
  deleteDialog.value = true
}

function asOptionIds(inIds) {
  const opts = staffOptions?.value || [];
  const out = [];
  if (!Array.isArray(inIds) || !opts.length) return [];
  for (const raw of inIds) {
   
    const match = opts.find(o => /* eslint-disable eqeqeq */ o.id == raw /* eslint-enable eqeqeq */);
    if (match) out.push(match.id);
  }
  return Array.from(new Set(out));
}

// ---- Staff Management tab ----
const staff = ref({
  selected: null,
  selectedId: null,
  memberIds: []
})
const staffOptions = ref([])
const staffLoading = ref(false)
const savingStaff = ref(false)
const staffError = ref('')
const assignedLoading = ref(false)
// Load assigned staff for a ward from backend and update staff.value.memberIds
async function loadAssigned(wardId) {
  assignedLoading.value = true;
  try {
    const res = await api.get(`/api/wards/${wardId}/staff`);
    const data = res?.data?.data || res?.data || {};
    let ids = Array.isArray(data.staffUserIds) ? data.staffUserIds
            : Array.isArray(data.staff_user_ids) ? data.staff_user_ids
            : Array.isArray(data.staffIds) ? data.staffIds
            : Array.isArray(data.staff) ? data.staff.map(s => s.id ?? s.user_id ?? s.token).filter(v => v != null)
            : [];
    staff.value.memberIds = asOptionIds(ids);
  } catch (_) {
    // leave existing selection if fetch fails
  } finally {
    assignedLoading.value = false;
  }
}

async function reloadAssigned() {
  const wardId = staff.value.selected?.id || staff.value.selectedId;
  if (!wardId) return;
  await loadAssigned(wardId);
}

async function removeAssigned(userId) {
  const wardId = staff.value.selected?.id || staff.value.selectedId;
  if (!wardId || userId == null) return;
  savingStaff.value = true;
  try {
    await api.delete(`/api/wards/${wardId}/staff/${userId}`);
    // update local selection
    staff.value.memberIds = staff.value.memberIds.filter(id => /* eslint-disable eqeqeq */ id != userId /* eslint-enable eqeqeq */);
    toast.add({ severity: 'success', summary: 'Removed', detail: 'Staff member removed from ward', life: 2000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Remove failed', detail: getErr(e), life: 3500 });
  } finally {
    savingStaff.value = false;
  }
}

async function fetchStaff() {
  staffLoading.value = true;
  staffError.value = '';
  try {
    const { data } = await api.get('/api/users', { params: { role: 'staff' } });
    const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    // Keep only staff
    const onlyStaff = raw.filter((u) => {
      const rolesArr = Array.isArray(u?.roles)
        ? u.roles.map((r) => (typeof r === 'string' ? r : (r?.name || r?.role || '')))
        : [];
      const roleStrs = [u?.role, u?.user_role, u?.type, u?.position]
        .filter(Boolean)
        .map((r) => String(r));
      const allRoles = rolesArr.concat(roleStrs).map((r) => r.toLowerCase());
      return allRoles.includes('staff') || allRoles.includes('municipal_staff') || allRoles.includes('municipalstaff');
    });

    const seen = new Map();
    for (const u of onlyStaff) {
      const id = u.id || u.user_id || u.token;
      if (id != null && !seen.has(id)) seen.set(id, u);
    }

    // Map to dropdown options and sort by name
    const list = Array.from(seen.values()).map((u) => ({
      id: u.id || u.user_id || u.token,
      fullName:
        [u.first_name, u.last_name].filter(Boolean).join(' ') ||
        u.fullName ||
        u.name ||
        u.email ||
        'Unknown',
      email: u.email || '',
    }));

    staffOptions.value = list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  } catch (e) {
    staffError.value = getErr(e);
    staffOptions.value = [];
  } finally {
    staffLoading.value = false;
  }
}

const staffSummary = computed(() => {
  const set = new Set(staff.value.memberIds)
  return staffOptions.value.filter(s => set.has(s.id))
})

async function saveStaff() {
  if (!staff.value.selected) {
    toast.add({ severity: 'warn', summary: 'Save Staff', detail: 'Pick a ward first', life: 2500 });
    return;
  }

  const wardId = staff.value.selected.id || staff.value.selectedId;
  const desired = Array.isArray(staff.value.memberIds) ? staff.value.memberIds : [];
  const desiredSet = new Set(desired);

  savingStaff.value = true;
  try {
    // 1) Load current assignment from backend to compute a diff
    let currentIds = [];
    try {
      const res = await api.get(`/api/wards/${wardId}/staff`);
      const data = res?.data?.data || res?.data || {};
      currentIds = Array.isArray(data.staffUserIds) ? data.staffUserIds
                 : Array.isArray(data.staff_user_ids) ? data.staff_user_ids
                 : Array.isArray(data.staffIds) ? data.staffIds
                 : Array.isArray(data.staff) ? data.staff.map(s => s.id ?? s.user_id ?? s.token).filter(v => v != null)
                 : [];
    } catch (_) {
      // If GET not available, fall back to what the row had when selected
      if (Array.isArray(staff.value.selected?.staff)) {
        currentIds = staff.value.selected.staff.map(s => s.id ?? s.user_id ?? s.token).filter(v => v != null);
      } else if (Array.isArray(staff.value.selected?.staff_user_ids)) {
        currentIds = staff.value.selected.staff_user_ids;
      } else if (Array.isArray(staff.value.selected?.staffUserIds)) {
        currentIds = staff.value.selected.staffUserIds;
      } else if (Array.isArray(staff.value.selected?.staffIds)) {
        currentIds = staff.value.selected.staffIds;
      }
    }

    // Normalize to dropdown option ids
    currentIds = asOptionIds(currentIds);

    // 2) Diff
    const currentSet = new Set(currentIds);
    const toAdd = desired.filter(id => !currentSet.has(id));
    const toRemove = currentIds.filter(id => !desiredSet.has(id));

    // 3) Apply changes using single-user endpoints to avoid bulk creation paths
    if (desired.length === 0) {
      // Nothing selected => clear all via dedicated endpoint
      await api.delete(`/api/wards/${wardId}/staff`);
    } else {
      // Remove first (in case of unique constraints), then add
      for (const id of toRemove) {
        try { await api.delete(`/api/wards/${wardId}/staff/${id}`); } catch (_) {}
      }
      for (const id of toAdd) {
        await api.post(`/api/wards/${wardId}/staff/${id}`);
      }
    }

    // Refresh + keep selection and current choices
    await loadRows();
    staff.value.selected = rows.value.find(x => x.id == wardId) || null;
    staff.value.memberIds = asOptionIds(desired);

    toast.add({ severity: 'success', summary: 'Saved', detail: 'Staff assignments saved', life: 2500 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: getErr(e), life: 4000 });
  } finally {
    savingStaff.value = false;
  }
}

// Keep derived fields in sync when selection changes
watch(() => manage.value.selected, (r) => {
  manage.value.selectedId = r && typeof r === 'object' ? (r.id || null) : null;
  manage.value.name = r && typeof r === 'object' ? (r.name || '') : '';
  manage.value.leaderId = r && typeof r === 'object'
    ? (r.leaderId || r?.leader_id || r?.leader?.id || null)
    : null;
})

watch(() => staff.value.selected, async (r) => {
  staff.value.selectedId = r?.id || null;
  if (staff.value.selectedId) {
    await loadAssigned(staff.value.selectedId);
  } else {
    staff.value.memberIds = [];
  }
})

onMounted(async () => {
  await fetchMe();
  await loadRows();
  fetchLeaders();
  fetchStaff();
})
</script>

<style scoped>
.field {
  margin-bottom: 0.75rem;
}
</style>