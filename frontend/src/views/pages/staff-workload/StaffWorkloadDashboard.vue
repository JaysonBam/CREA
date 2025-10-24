<template>
  <div class="card">
    <div class="flex items-center justify-between mb-3">
      <div class="text-xl font-semibold">Staff &amp; Assigned Report Issues</div>
      <div class="flex items-center gap-2">
        <Button text icon="pi pi-plus" label="Expand All" @click="expandAll" />
        <Button text icon="pi pi-minus" label="Collapse All" @click="collapseAll" />
        <Button text icon="pi pi-refresh" label="Refresh" @click="load" />
      </div>
    </div>

    <DataTable
      :value="staffRows"
      :loading="loading"
      dataKey="token"
      v-model:expandedRows="expandedRows"
      responsiveLayout="scroll"
      :paginator="true"
      :rows="10"
      showGridlines
      tableStyle="min-width: 60rem"
    >
      <Column expander style="width: 4rem" />
      <Column header="Staff Member" style="min-width: 18rem">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <i class="pi pi-user text-surface-500"></i>
            <div class="leading-tight">
              <div class="font-medium">
                {{ fullName(data?.User) }}
              </div>
              <div class="text-sm text-surface-500">{{ data?.User?.email || "—" }}</div>
            </div>
          </div>
        </template>
      </Column>

      <Column header="Workload" style="width: 10rem">
        <template #body="{ data }">
          <div class="font-semibold">{{ data.__workload || 0 }}</div>
        </template>
      </Column>

      <Column header="Status" style="width: 12rem">
        <template #body="{ data }">
          <Tag :value="staffStatusText(data)" :severity="staffStatusSeverity(data)" />
        </template>
      </Column>

      <!-- Expansion: Issues assigned to this staff -->
      <template #expansion="{ data }">
        <div class="p-3">
          <div class="font-semibold mb-2">
            Report Issues for {{ fullName(data?.User) }}
          </div>

          <DataTable
            :value="data.__issues || []"
            dataKey="token"
            :paginator="true"
            :rows="5"
            showGridlines
          >
            <template #empty>No assigned report issues.</template>

            <!-- Description with tooltip -->
            <Column header="Description" style="min-width: 22rem">
              <template #body="{ data: row }">
                <span class="truncate-desc" v-tooltip="row.description || '—'">
                {{ truncate(row.description, 80) }}
                </span>
              </template>
            </Column>

            <Column field="category" header="Category" style="min-width: 12rem" />

            <Column field="status" header="Status" style="min-width: 12rem">
              <template #body="{ data: row }">
                <Tag :value="row.status" :severity="issueStatusSeverity(row.status)" />
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useToast } from "primevue/usetoast";
import {
  listIssueReportsForMyWards,
  listIssueStaffAssignments,
} from "@/utils/backend_helper";

const toast = useToast();

const loading = ref(false);
const expandedRows = ref({});
const issues = ref([]);     
const staffMap = ref(new Map()); 

//UI Helpers
function fullName(u){
  if (!u) return "—";
  const s = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return s || (u.email || "—");
}
function issueStatusSeverity(s){
  return s === "RESOLVED" ? "success"
       : s === "IN_PROGRESS" ? "warning"
       : s === "ACKNOWLEDGED" ? "info"
       : s === "NEW" ? "primary"
       : "secondary";
}
//Get the status for the employment
function staffStatusText(s){
  return s?.employment_status || s?.status || "Active";
}
function staffStatusSeverity(s){
  const v = (s?.employment_status || s?.status || "active").toString().toLowerCase();
  if (["active", "on-duty"].includes(v)) return "success";
  if (["on leave", "leave", "on-leave"].includes(v)) return "warn";
  if (["inactive", "suspended"].includes(v)) return "danger";
  return "info";
}
function truncate(text, max = 80){
  if (!text) return "—";
  const t = String(text);
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
//Expand all rows to show all workload
function expandAll(){
  const obj = {};
  staffRows.value.forEach(s => obj[s.token] = true);
  expandedRows.value = obj;
}
//Collapse all rows to hide workload
function collapseAll(){
  expandedRows.value = {};
}

const staffRows = computed(() => Array.from(staffMap.value.values())
  .sort((a,b) => (b.__workload||0) - (a.__workload||0))
);

async function load(){
  loading.value = true;
  staffMap.value = new Map();

  try {
    //Get all issues for the community leader's wards
    const { data } = await listIssueReportsForMyWards({});
    issues.value = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

    //For each issue, load staff assignments
    const concurrency = 5;
    let i = 0;
    async function worker(){
      while (i < issues.value.length){
        const idx = i++;
        const issue = issues.value[idx];
        try {
          const res = await listIssueStaffAssignments(issue.token);
          const rows = Array.isArray(res?.data) ? res.data : [];
          for (const asg of rows){
            const staff = asg?.staff;
            if (!staff?.token) continue;

            if (!staffMap.value.has(staff.token)){
              const base = {
                ...staff,
                __issues: [],
                __workload: 0,
              };
              staffMap.value.set(staff.token, base);
            }
            const entry = staffMap.value.get(staff.token);

            entry.__issues.push({
              token: issue.token,
              id: issue.id,
              display_id: issue.display_id,
              category: issue.category,
              status: issue.status,
              title: issue.title,
              description: issue.description || "",   // include full description for tooltip
            });
            entry.__workload = entry.__issues.length;
          }
        } catch {
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, Math.max(1, issues.value.length)) },
      () => worker()
    );
    await Promise.all(workers);

    if (staffMap.value.size <= 3) expandAll();

  } catch(e){
    toast.add({ severity:"error", summary:"Load failed", detail: e?.response?.data?.error || e.message, life: 3500 });
  } finally {
    loading.value = false;
  }
}

function openIssue(row){
  toast.add({ severity:"info", summary:"Open Issue", detail: row.title || row.display_id || row.token, life: 2000 });
}

// initial load
load();
</script>

<style scoped>
:deep(.p-datatable .p-datatable-header){
  padding: 0.75rem 1rem;
}
:deep(.p-datatable .p-datatable-thead > tr > th){
  font-weight: 600;
}

 /* Truncate description for hover tooltip  */
.truncate-desc{
  display: inline-block;
  max-width: 36rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}
</style>
