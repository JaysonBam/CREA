<script setup>
import { ref, computed } from 'vue'

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

// Local data (backend to be completed)
const people = ref([
  { id: 101, name: 'Alice', role: 'Leader' },
  { id: 102, name: 'Bob', role: 'Staff' },
  { id: 103, name: 'John', role: 'Staff' },
  { id: 104, name: 'David', role: 'Leader' },
  { id: 105, name: 'Jake', role: 'Staff' },
  { id: 106, name: 'Kim', role: 'Staff' },
])

const wards = ref([
  { id: 1, name: 'Ward 1', leaderId: 101, staffIds: [102] },
  { id: 2, name: 'Ward 2', leaderId: 104, staffIds: [103] },
  { id: 3, name: 'Ward 3', leaderId: null, staffIds: [] },
])

const nextWardId = ref(4)

// Filtering state 
const createInitialFilters = () => ({
  global: { value: null, matchMode: 'contains' },
  name: { operator: 'and', constraints: [{ value: null, matchMode: 'contains' }] },
  leaderName: { value: null, matchMode: 'in' },
})
const filters1 = ref(createInitialFilters())
const loading1 = ref(false)

// Leader names for the MultiSelect filter
const leaderNameOptions = computed(() => {
  return people.value.filter(p => p.role === 'Leader').map(l => l.name)
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
function createWard() {
  const name = newName.value.trim()
  if (!name) return
  wards.value.push({ id: nextWardId.value++, name, leaderId: null })
  showCreate.value = false
  toast.add({ severity: 'success', summary: 'Created', detail: 'Ward added', life: 2000 })
}

const leaderOptions = computed(() =>
  people.value.filter(p => p.role === 'Leader').map(l => ({ label: l.name, value: l.id }))
)

const staffList = computed(() => people.value.filter(p => p.role === 'Staff'))
const staffOptions = computed(() => staffList.value.map(s => ({ label: s.name, value: s.id })))

function staffOptionsForWard(wardId) {
  const assignedElsewhere = new Set()
  wards.value.forEach(w => {
    if (w.id !== wardId) (w.staffIds || []).forEach(id => assignedElsewhere.add(id))
  })
  return staffOptions.value.filter(opt => !assignedElsewhere.has(opt.value))
}

function saveStaffForWard(w) {
  const idx = wards.value.findIndex(x => x.id === w.id)
  if (idx !== -1) {
    // ensure unique staff
    const newlyAssigned = new Set(w.staffIds || [])
    wards.value = wards.value.map(x => x.id === w.id ? { ...x, staffIds: Array.from(newlyAssigned) } : { ...x, staffIds: (x.staffIds || []).filter(id => !newlyAssigned.has(id)) })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Staff assignment updated', life: 1500 })
  }
}

function staffNames(ids) {
  return (ids || []).map(id => people.value.find(p => p.id === id)?.name || `#${id}`)
}

function saveWardInline(w) {
  const idx = wards.value.findIndex(x => x.id === w.id)
  if (idx !== -1) {
    wards.value[idx] = { ...wards.value[idx], name: w.name, leaderId: w.leaderId ?? null }
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Ward updated', life: 1500 })
  }
}

function removeWard(w) {
  if (!w?.id) return
  if (window.confirm(`Delete "${w.name}"?`)) {
    wards.value = wards.value.filter(x => x.id !== w.id)
    toast.add({ severity: 'info', summary: 'Deleted', detail: 'Ward removed', life: 1500 })
  }
}
</script>

<template>
  <Toast />

  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <div class="font-semibold text-xl">Wards</div>
      <Button label="New Ward" icon="pi pi-plus" @click="openCreate" />
    </div>

    <TabView>
      <!-- All Wards -->
      <TabPanel header="All Wards">
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

          <Column field="id" header="ID" style="width: 8rem" />

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
        </DataTable>
      </TabPanel>

      <!-- Ward Management -->
      <TabPanel header="Ward Management">
        <DataTable :value="wards" dataKey="id" showGridlines responsiveLayout="scroll">
          <template #empty> No wards to manage. </template>

          <Column field="id" header="ID" style="width: 8rem" />

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
      <TabPanel header="Staff Assignment">
        <DataTable :value="wards" dataKey="id" showGridlines responsiveLayout="scroll">
          <template #empty> No wards available. </template>

          <Column field="id" header="ID" style="width: 8rem" />
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