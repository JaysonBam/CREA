<script setup>
import { ref, computed, onMounted } from 'vue'

// PrimeVue components
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Dropdown from 'primevue/dropdown'

import { listWards as apiListWards } from '@/service/WardService'

import { useRouter } from 'vue-router'

const API_BASE = import.meta.env.VITE_API_BASE ?? (window.location.port === '5173' ? 'http://127.0.0.1:5000' : '')

const router = useRouter()

const TOKEN_KEY = 'JWT'
const userRole = ref('guest')            // 'admin' | 'communityleader' | 'staff' | 'resident'
const userWardId = ref(null)             // UUID or numeric id, when available
const userId = ref(null)                // current user's id from JWT

function decodeJwtPayload (t) {
  try {
    return JSON.parse(atob(String(t).split('.')[1] || ''))
  } catch (e) {
    return {}
  }
}

const canAdmin = computed(() => userRole.value === 'admin')
const canLeader = computed(() => userRole.value === 'communityleader')
const canManageWard = computed(() => canAdmin.value || canLeader.value)
const hasOwnWard = computed(() => !!userWardId.value)

function goToMyWardProfile () {
  if (!userWardId.value) return
  router.push({ name: 'ward-profile', params: { wardId: userWardId.value } })
}
function goToMyWardStats () {
  if (!userWardId.value) return
  router.push({ name: 'ward-stats', params: { wardId: userWardId.value } })
}

function tryInferWardFromData () {
  // If already known, do nothing
  if (userWardId.value) return
  // Leader: infer from wards where leaderId === userId
  if (canLeader.value && userId.value) {
    const w = wards.value.find(w => String(w.leaderId || '') === String(userId.value))
    if (w?.id) userWardId.value = w.id
  }
  // Staff: infer from wards where staffIds contains userId
  if (userRole.value === 'staff' && userId.value) {
    const w = wards.value.find(w => Array.isArray(w.staffIds) && w.staffIds.map(String).includes(String(userId.value)))
    if (w?.id) userWardId.value = w.id
  }
}

// People loaded from backend
const people = ref([])

async function loadPeople () {
  try {
    const res = await fetch(`${API_BASE}/api/users`, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const users = await res.json()
    // Accept both lowercase and TitleCase roles; restrict to staff & leaders
    const normalizeRole = (r) => String(r || '').toLowerCase()
    people.value = (users || [])
      .filter(u => u?.isActive !== false) // include active
      .filter(u => ['staff', 'communityleader'].includes(normalizeRole(u.role)))
      .map(u => ({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
        role: normalizeRole(u.role) // 'staff' | 'communityleader'
      }))
  } catch (err) {
    console.error('Failed to load users', err)
    toast.add({ severity: 'error', summary: 'Load failed', detail: `Users: ${String(err?.message || err)}`, life: 3000 })
  }
}



const wards = ref([])

const nextWardId = ref(4)

// Load from backend
async function loadWards () {
  loading1.value = true
  try {
    const data = await apiListWards()
    wards.value = (data || []).map(w => {
      const leaderId = w?.leader?.User?.id ?? w?.leaderId ?? w?.leader_id ?? null
      const staffIds = Array.isArray(w?.staff)
        ? w.staff.map(s => s?.User?.id ?? s?.user_id ?? s?.id).filter(Boolean)
        : Array.isArray(w?.staffIds) ? w.staffIds.filter(Boolean) : []
      return {
        id: w.id,
        name: w.name,
        code: w.code,
        leaderId,
        staffIds,
        _originalLeaderId: leaderId ?? null,
        _originalStaffIds: [...staffIds],
      }
    })
  } catch (err) {
    console.error('Failed to load wards', err)
    toast.add({ severity: 'error', summary: 'Load failed', detail: String(err?.message || err), life: 3000 })
  } finally {
    loading1.value = false
  }
}

function refreshWards () {
  loadWards()
}


// Filtering state 
const createInitialFilters = () => ({
  global: { value: null, matchMode: 'contains' },
  name: { operator: 'and', constraints: [{ value: null, matchMode: 'contains' }] },
  leaderName: { value: null, matchMode: 'in' },
})
const filters1 = ref(createInitialFilters())
const loading1 = ref(false)

// Leader names for the multiselect filter
const leaderNameOptions = computed(() => {
    return people.value.filter(p => p.role === 'communityleader').map(l => l.name)
})

// Rows augmented with leaderName for filtering/display 
const rows = computed(() =>
  wards.value.map(w => ({
    ...w,
    leaderName: people.value.find(p => p.id === w.leaderId)?.name ?? '—',
  }))
)

function clearFilter () {
  filters1.value = createInitialFilters()
}

// Add Ward 
const showCreate = ref(false)
const newName = ref('')
const toast = useToast()

function openCreate() {
  newName.value = ''
  showCreate.value = true
}
async function createWard() {
  const name = newName.value.trim()
  if (!name) return
  try {
    const res = await fetch(`${API_BASE}/api/wards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const w = json?.data || json
    // Push mapped record
    const leaderId = w?.leader?.User?.id ?? w?.leaderId ?? w?.leader_id ?? null
    const staffIds = Array.isArray(w?.staff)
      ? w.staff.map(s => s?.User?.id ?? s?.user_id ?? s?.id).filter(Boolean)
      : Array.isArray(w?.staffIds) ? w.staffIds.filter(Boolean) : []
    wards.value.push({
      id: w.id,
      name: w.name,
      code: w.code,
      leaderId,
      staffIds,
      _originalLeaderId: leaderId ?? null,
      _originalStaffIds: [...staffIds],
    })
    showCreate.value = false
    toast.add({ severity: 'success', summary: 'Created', detail: 'Ward added', life: 2000 })
  } catch (err) {
    console.error('Create ward failed', err)
    toast.add({ severity: 'error', summary: 'Create failed', detail: String(err?.message || err), life: 3000 })
  }
}

const leaderOptions = computed(() =>
    people.value.filter(p => p.role === 'communityleader').map(l => ({ label: l.name, value: l.id }))
)

const staffList = computed(() => people.value.filter(p => p.role === 'staff'))
const staffOptions = computed(() => staffList.value.map(s => ({ label: s.name, value: s.id })))

function staffOptionsForWard(wardId) {
  const assignedElsewhere = new Set()
  wards.value.forEach(w => {
    if (w.id !== wardId) (w.staffIds || []).forEach(id => assignedElsewhere.add(id))
  })
  return staffOptions.value.filter(opt => !assignedElsewhere.has(opt.value))
}

async function saveStaffForWard(w) {
  const idx = wards.value.findIndex(x => x.id === w.id)
  if (idx === -1) return
  const before = new Set(w._originalStaffIds || [])
  const after = new Set(w.staffIds || [])
  const toAdd = [...after].filter(id => !before.has(id))
  const toRemove = [...before].filter(id => !after.has(id))
  try {
    // Apply removals
    for (const uid of toRemove) {
      const res = await fetch(`${API_BASE}/api/wards/${w.id}/staff/${uid}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error(`Remove failed: HTTP ${res.status}`)
    }
    // Apply additions
    for (const uid of toAdd) {
      const res = await fetch(`${API_BASE}/api/wards/${w.id}/staff/${uid}`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) throw new Error(`Add failed: HTTP ${res.status}`)
    }
    // Update originals
    w._originalStaffIds = [...(w.staffIds || [])]
    wards.value[idx] = { ...wards.value[idx], staffIds: [...w.staffIds] }
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Staff assignment updated', life: 1500 })
  } catch (err) {
    console.error('Save staff failed', err)
    toast.add({ severity: 'error', summary: 'Save failed', detail: String(err?.message || err), life: 3000 })
  }
}

function staffNames(ids) {
  return (ids || []).map(id => people.value.find(p => p.id === id)?.name || `#${id}`)
}

async function saveWardInline(w) {
  const idx = wards.value.findIndex(x => x.id === w.id)
  if (idx === -1) return
  try {
    // Update basic fields (name, code)
    const res = await fetch(`${API_BASE}/api/wards/${w.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: w.name, code: w.code }),
      credentials: 'include'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // Assign leader if changed
    if (w.leaderId !== w._originalLeaderId) {
      const res2 = await fetch(`${API_BASE}/api/wards/${w.id}/leader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderUserId: w.leaderId }),
        credentials: 'include'
      })
      if (!res2.ok) throw new Error(`Leader assign failed: HTTP ${res2.status}`)
      w._originalLeaderId = w.leaderId ?? null
    }
    wards.value[idx] = { ...wards.value[idx], name: w.name, leaderId: w.leaderId ?? null }
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Ward updated', life: 1500 })
  } catch (err) {
    console.error('Update ward failed', err)
    toast.add({ severity: 'error', summary: 'Save failed', detail: String(err?.message || err), life: 3000 })
  }
}

async function removeWard(w) {
  if (!w?.id) return
  if (!window.confirm(`Delete "${w.name}"?`)) return
  try {
    const res = await fetch(`${API_BASE}/api/wards/${w.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    wards.value = wards.value.filter(x => x.id !== w.id)
    toast.add({ severity: 'info', summary: 'Deleted', detail: 'Ward removed', life: 1500 })
  } catch (err) {
    console.error('Delete ward failed', err)
    toast.add({ severity: 'error', summary: 'Delete failed', detail: String(err?.message || err), life: 3000 })
  }
}

onMounted(async () => {
  // Read role and wardId from JWT
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) {
    const payload = decodeJwtPayload(token)
    if (payload && typeof payload === 'object') {
      userRole.value = String(payload.role || 'guest').toLowerCase()
      userId.value = payload.userId || payload.user_id || payload.id || null
      userWardId.value = payload.wardId || payload.ward_id || null
    }
  }
  await Promise.all([loadPeople(), loadWards()])
  tryInferWardFromData()
})
</script>

<template>
  <Toast />

  <div class="card">
    <!-- Non-admin view: show only quick actions for own ward -->
    <div v-if="!canAdmin" class="mb-4">
      <div class="flex justify-between items-center">
        <div class="font-semibold text-xl">My Ward</div>
      </div>
      <div class="mt-3 flex gap-2 flex-wrap">
        <Button label="Open My Ward Profile" icon="pi pi-id-card" @click="goToMyWardProfile" :disabled="!hasOwnWard" />
        <Button label="Open My Ward Stats" icon="pi pi-chart-bar" @click="goToMyWardStats" :disabled="!hasOwnWard" />
      </div>
      <p class="mt-2 text-sm text-color-secondary" v-if="!hasOwnWard">No ward linked to your account yet.</p>
      <hr class="my-4" />
    </div>

    <template v-if="canAdmin">
      <div class="flex justify-between items-center mb-4">
        <div class="font-semibold text-xl">Wards</div>
        <Button label="New Ward" icon="pi pi-plus" @click="openCreate" />
      </div>
    </template>

    <TabView v-if="canAdmin || canLeader">
      <!-- All Wards -->
      <TabPanel header="All Wards" v-if="canAdmin">
        <DataTable
          :value="rows"
          dataKey="id"
          :paginator="true"
          :rows="10"
          :rowHover="true"
          v-model:filters="filters1"
          filterDisplay="menu"
          :loading="loading1"
          :filters="filters1"
          :globalFilterFields="['name','leaderName']"
          showGridlines
          responsiveLayout="scroll"
        >
          <template #header>
            <div class="flex justify-between items-center gap-3">
              <div class="flex items-center gap-2">
                <Button type="button" icon="pi pi-filter-slash" label="Clear" outlined @click="clearFilter()" />

                <Button type="button" icon="pi pi-refresh" label="Refresh" outlined @click="refreshWards()" />
              </div>
              <IconField>
                <InputIcon>
                  <i class="pi pi-search" />
                </InputIcon>
                <InputText v-model="filters1['global'].value" placeholder="Keyword Search" />
              </IconField>
            </div>
          </template>
          <template #empty> No wards found. </template>
          <template #loading> Loading wards data. Please wait. </template>


          <Column field="name" header="Name" style="min-width: 12rem">
            <template #body="{ data }">
              {{ data.name }}
            </template>
            <template #filter="{ filterModel }">
              <InputText v-model="filterModel.value" type="text" placeholder="Search by name" />
            </template>
          </Column>

          <Column header="Leader" filterField="leaderName" style="min-width: 12rem" :showFilterMatchModes="false">
            <template #body="{ data }">
              {{ data.leaderName }}
            </template>
            <template #filter="{ filterModel }">
              <MultiSelect v-model="filterModel.value" :options="leaderNameOptions" placeholder="Any" display="chip" />
            </template>
          </Column>
          <Column header="Actions" style="min-width: 10rem">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button label="View Profile" icon="pi pi-id-card" @click="router.push({ name: 'ward-profile', params: { wardId: data.id } })" />
                <Button label="View Stats" icon="pi pi-chart-bar" @click="router.push({ name: 'ward-stats', params: { wardId: data.id } })" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- Ward Management -->
      <TabPanel header="Ward Management" v-if="canAdmin">
        <DataTable :value="wards" dataKey="id" showGridlines responsiveLayout="scroll">
          <template #empty> No wards to manage. </template>


          <Column field="name" header="Name" style="min-width: 14rem">
            <template #body="{ data }">
              <InputText v-model="data.name" placeholder="Ward name" />
            </template>
          </Column>

          <Column header="Leader" field="leaderId" style="min-width: 14rem">
            <template #body="{ data }">
              <Dropdown v-model="data.leaderId" :options="leaderOptions" optionLabel="label" optionValue="value" placeholder="Select leader" showClear />
            </template>
          </Column>

          <Column header="Actions" style="min-width: 14rem">
            <template #body="{ data }">
              <div class="flex gap-2">
                <Button label="Save" icon="pi pi-check" severity="success" @click="saveWardInline(data)" />
                <Button label="Delete" icon="pi pi-trash" severity="danger" @click="removeWard(data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- Staff Assignment -->
      <TabPanel header="Staff Assignment" v-if="canManageWard">
        <DataTable :value="wards" dataKey="id" showGridlines responsiveLayout="scroll">
          <template #empty> No wards available. </template>

          <Column field="name" header="Ward" style="min-width: 14rem" />

          <Column header="Assigned Staff" style="min-width: 18rem">
            <template #body="{ data }">
              <MultiSelect
                v-model="data.staffIds"
                :options="staffOptionsForWard(data.id)"
                optionLabel="label"
                optionValue="value"
                placeholder="Select staff"
                display="chip"
                showClear
              />
            </template>
          </Column>

          <Column header="Summary" style="min-width: 16rem">
            <template #body="{ data }">
              {{ staffNames(data.staffIds).join(', ') || '—' }}
            </template>
          </Column>

          <Column header="Actions" style="min-width: 12rem">
            <template #body="{ data }">
              <Button label="Save" icon="pi pi-check" severity="success" @click="saveStaffForWard(data)" />
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>

  <!-- Create -->
  <Dialog v-model:visible="showCreate" header="New Ward" modal :style="{width: '30rem'}">
    <div class="flex flex-column gap-3">
      <span class="p-float-label">
        <InputText id="name" v-model="newName" />
        <label for="name">Ward name</label>
      </span>
      <div class="flex justify-content-end gap-2">
        <Button label="Cancel" severity="secondary" @click="showCreate=false" />
        <Button label="Create" icon="pi pi-check" @click="createWard" />
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
</style>