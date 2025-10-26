<template>
  <div class="card bg-white dark:bg-surface-900 dark:text-surface-0 p-0 overflow-hidden rounded-xl shadow-sm">
    <!-- Header -->
    <div class="px-6 md:px-8 lg:px-10 pt-6 md:pt-8">
      <div class="flex items-center gap-3">
        <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <i class="pi pi-users text-primary text-lg"></i>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Ward Requests</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Manage and respond to requests from staff and community leaders.
          </p>
        </div>
        <div class="ml-auto hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <i class="pi pi-database"></i>
          <span>{{ requests.length }} total</span>
          <span class="text-gray-300 dark:text-surface-600">•</span>
          <i class="pi pi-filter"></i>
          <span>{{ filteredRequests.length }} shown</span>
        </div>
      </div>
    </div>

    <!-- Sticky Filters -->
    <div
      class="px-6 md:px-8 lg:px-10 mt-4 sticky top-0 z-20 bg-white/85 dark:bg-surface-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-surface-900/60 border-y border-gray-100 dark:border-surface-700"
      v-if="!isLeaderWithWard"
    >
      <div class="py-3 flex flex-col md:flex-row md:items-center gap-3">
        <!-- Switch Filter -->
        <div class="flex items-center gap-2">
          <span class="font-semibold text-surface-900 dark:text-surface-0">Show:</span>
          <button
            :class="[
              'px-3 py-1 rounded-lg text-sm transition',
              filterType === 'communityleader'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-surface-800 dark:text-surface-0 dark:hover:bg-surface-700'
            ]"
            @click="filterType = 'communityleader'"
          >
            Community Leaders
          </button>
          <button
            :class="[
              'px-3 py-1 rounded-lg text-sm transition',
              filterType === 'staff'
                ? 'bg-blue-600 text-white dark:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-surface-800 dark:text-surface-0 dark:hover:bg-surface-700'
            ]"
            @click="filterType = 'staff'"
          >
            Staff
          </button>
        </div>

        <!-- Divider dot -->
        <span class="hidden md:inline text-gray-300 dark:text-surface-600 select-none">•</span>

        <!-- Ward Dropdown Filter -->
        <div class="flex items-center gap-2">
          <span class="font-semibold text-surface-900 dark:text-surface-0">Ward:</span>
          <label class="relative">
            <select
              v-model="selectedWardId"
              class="appearance-none p-2 pr-8 border rounded-lg bg-white dark:bg-surface-800 dark:text-surface-0 dark:border-surface-600 text-sm"
            >
              <option value="">All Wards</option>
              <option v-for="ward in wards" :key="ward.id" :value="ward.id">
                {{ ward.name }} ({{ ward.code }})
              </option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
              <i class="pi pi-angle-down text-xs"></i>
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Leader banner (context) -->
    <div
      v-if="isLeaderWithWard"
      class="mx-6 md:mx-8 lg:mx-10 mt-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-100 p-3 text-sm"
    >
      <div class="flex items-start gap-2">
        <i class="pi pi-info-circle mt-0.5"></i>
        <div>
          Showing staff requests for your assigned ward:
          <span class="font-semibold">{{ user?.ward_name }} ({{ user?.ward_code }})</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-6 md:px-8 lg:px-10 py-6">
      <!-- Loading -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="animate-pulse">
          <div class="h-5 w-40 bg-gray-200 dark:bg-surface-700 rounded mb-2"></div>
          <div class="rounded-xl border border-gray-200 dark:border-surface-700 p-4">
            <div class="h-4 w-3/4 bg-gray-200 dark:bg-surface-700 rounded mb-2"></div>
            <div class="h-4 w-1/2 bg-gray-200 dark:bg-surface-700 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20 text-red-800 dark:text-red-100 p-4"
      >
        <div class="flex items-start gap-3">
          <i class="pi pi-exclamation-triangle mt-0.5"></i>
          <div>{{ error }}</div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredRequests.length === 0"
        class="rounded-xl border border-dashed border-gray-300 dark:border-surface-700 p-10 text-center"
      >
        <div class="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-surface-800">
          <i class="pi pi-inbox text-gray-400 text-xl"></i>
        </div>
        <div class="font-semibold text-surface-900 dark:text-surface-0">No ward requests found</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Adjust filters or check back later.</div>
      </div>

      <!-- List -->
      <div v-else class="space-y-4">
        <div
          v-for="req in filteredRequests"
          :key="req.id"
          class="rounded-xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-sm overflow-hidden"
        >
          <!-- Row -->
          <button
            class="w-full text-left p-4 md:p-5 flex items-start gap-3 md:gap-4 hover:bg-gray-50 dark:hover:bg-surface-700/60 transition"
            @click="toggleExpand(req.id)"
          >
            <!-- Avatar / Monogram -->
            <div
              class="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold"
            >
              {{ (req.person?.first_name?.[0] || 'U') + (req.person?.last_name?.[0] || '') }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">
                  {{ req.person ? req.person.first_name + ' ' + req.person.last_name : 'Unknown' }}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-300">(ID: {{ req.person_id }})</span>

                <span class="mx-2 hidden md:inline text-gray-300 dark:text-surface-600 select-none">•</span>

                <!-- Ward -->
                <span class="text-sm text-gray-600 dark:text-gray-300 truncate">
                  <i class="pi pi-map-marker mr-1 text-gray-400"></i>
                  {{ req.ward ? `${req.ward.name} (${req.ward.code})` : req.ward_id }}
                </span>

                <span class="mx-2 hidden md:inline text-gray-300 dark:text-surface-600 select-none">•</span>

                <!-- Submitted date -->
                <span class="text-sm text-gray-600 dark:text-gray-300">
                  <i class="pi pi-calendar mr-1 text-gray-400"></i>{{ formatDate(req.created_at) }}
                </span>

                <!-- Type badge -->
                <span class="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                      :class="typeBadgeClass(req.job_description)">
                  <i :class="typeBadgeIcon(req.job_description)"></i>
                  {{ typeBadgeLabel(req.job_description) }}
                </span>
              </div>

              <!-- Message preview -->
              <p class="mt-1 text-gray-700 dark:text-gray-200 line-clamp-2">
                {{ req.message }}
              </p>
            </div>

            <!-- Toggle indicator -->
            <i
              class="pi ml-2 md:ml-4 text-gray-400"
              :class="expanded[req.id] ? 'pi-chevron-up' : 'pi-chevron-down'"
            ></i>
          </button>

          <!-- Expandable content -->
          <div
            v-show="expanded[req.id]"
            class="border-t border-gray-100 dark:border-surface-700 bg-gray-50/60 dark:bg-surface-900/40 p-4 md:p-5"
          >
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Message
                </div>
                <div class="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 text-gray-800 dark:text-gray-100">
                  <pre class="whitespace-pre-wrap break-words text-sm">{{ req.message }}</pre>
                </div>
              </div>

              <div class="grid gap-4">
                <div>
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Ward
                  </div>
                  <div class="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 text-sm">
                    {{ req.ward ? `${req.ward.name} (${req.ward.code})` : req.ward_id }}
                  </div>
                </div>

                <div>
                  <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Job Description
                  </div>
                  <div class="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-3 text-sm">
                    {{ req.job_description || '—' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Admin message -->
            <div class="mt-4">
              <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Your Message (optional)
              </label>
              <textarea
                v-model="adminMessages[req.id]"
                rows="2"
                class="w-full p-3 border rounded-lg bg-white dark:bg-surface-800 dark:text-surface-0 dark:border-surface-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Add context for accepting or rejecting this request"
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <button
                v-if="!isLeaderWithWard || (isLeaderWithWard && String(req.ward_id) === String(assignedWardId))"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-sm"
                @click.stop="respondToRequest(req, 'accept')"
              >
                <i class="pi pi-check-circle"></i> Accept
              </button>

              <button
                v-if="!isLeaderWithWard || (isLeaderWithWard && String(req.ward_id) === String(assignedWardId))"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-sm"
                @click.stop="respondToRequest(req, 'reject')"
              >
                <i class="pi pi-times-circle"></i> Reject
              </button>

              <span
                v-else
                class="text-xs text-gray-500 dark:text-gray-400 ml-1"
                title="You can only act on requests for your assigned ward"
              >
                You can only respond to requests for your assigned ward.
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- /List -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { get, post } from '@/utils/api';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const expanded = ref({});
const adminMessages = ref({});

// Filter states
const filterType = ref('communityleader'); // 'communityleader' or 'staff'
const selectedWardId = ref('');
const wards = ref([]);

// User info
const user = ref(null);
const loadingUser = ref(true);

onMounted(async () => {
  try {
    const res = await get('/api/auth/me');
    if (res.data && res.data.success) {
      user.value = res.data.user;
    }
  } finally {
    loadingUser.value = false;
  }
});

const isLeaderWithWard = computed(() => {
  return (
    user.value &&
    user.value.role &&
    user.value.role.toLowerCase() === 'communityleader' &&
    user.value.ward_id &&
    user.value.ward_name &&
    user.value.ward_code
  );
});
const assignedWardId = computed(() => user.value?.ward_id);

const filteredRequests = computed(() => {
  if (isLeaderWithWard.value) {
    return requests.value.filter(req => {
      const jobDesc = String(req.job_description || '').toLowerCase();
      const isStaff = !jobDesc.includes('community leader');
      return isStaff && String(req.ward_id) === String(assignedWardId.value);
    });
  }
  const result = requests.value.filter(req => {
    const jobDesc = String(req.job_description || '').toLowerCase();
    const isLeader = jobDesc.includes('community leader');
    const isStaff = !isLeader;
    if (filterType.value === 'communityleader' && !isLeader) return false;
    if (filterType.value === 'staff' && !isStaff) return false;
    if (
      selectedWardId.value &&
      String(req.ward_id) !== String(selectedWardId.value) &&
      (!req.ward || String(req.ward.id) !== String(selectedWardId.value))
    )
      return false;
    return true;
  });
  return result;
});

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}
function toggleExpand(id) {
  expanded.value[id] = !expanded.value[id];
}
async function respondToRequest(req, type) {
  try {
    await post('/api/ward-requests', {
      person_id: req.person_id,
      type,
      message: adminMessages.value[req.id] || '',
      ward_id: req.ward_id,
      job_description: req.job_description || 'staff description',
    });
    adminMessages.value[req.id] = '';
    expanded.value[req.id] = false;
    await fetchRequests();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to submit response.';
  }
}
async function fetchRequests() {
  loading.value = true;
  try {
    const res = await get('/api/ward-requests');
    if (res.data && res.data.success) {
      requests.value = res.data.requests;
    } else {
      error.value = 'Failed to fetch ward requests';
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to fetch ward requests';
  } finally {
    loading.value = false;
  }
}
async function fetchWards() {
  try {
    const res = await get('/api/wards');
    wards.value = Array.isArray(res?.data?.data) ? res.data.data : [];
  } catch {
    wards.value = [];
  }
}
onMounted(async () => {
  await fetchRequests();
  await fetchWards();
});

/* --- UI helpers for type badges (purely visual; does not affect logic) --- */
function typeBadgeClass(job) {
  const isLeader = String(job || '').toLowerCase().includes('community leader');
  return isLeader
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
}
function typeBadgeLabel(job) {
  return String(job || '').toLowerCase().includes('community leader') ? 'Leader' : 'Staff';
}
function typeBadgeIcon(job) {
  return String(job || '').toLowerCase().includes('community leader') ? 'pi pi-star' : 'pi pi-briefcase';
}
</script>

<style scoped>
/* Smooth expand/collapse (v-show) */
[style*="display: none"] + ._placeholder_ {}
/* Optional: if you switch to v-if + transitions, you can remove the hack above */

/* Line clamp utility if not present globally */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
          line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
