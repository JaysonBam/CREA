<template>
  <div class="card p-6 md:p-8 lg:p-10 bg-white dark:bg-surface-900 dark:text-surface-0">
  <h1 class="text-2xl font-bold mb-6 text-surface-900 dark:text-surface-0">Ward Requests</h1>
    <!-- Filters -->
  <div v-if="!isLeaderWithWard" class="flex flex-col md:flex-row gap-4 mb-6 items-center">
      <!-- Switch Filter -->
      <div class="flex gap-2 items-center">
        <span class="font-semibold text-surface-900 dark:text-surface-0">Show:</span>
        <button :class="['px-3 py-1 rounded', filterType === 'communityleader' ? 'bg-blue-600 text-white dark:bg-blue-700 dark:text-surface-0' : 'bg-gray-200 dark:bg-surface-800 dark:text-surface-0']" @click="filterType = 'communityleader'">Community Leaders</button>
        <button :class="['px-3 py-1 rounded', filterType === 'staff' ? 'bg-blue-600 text-white dark:bg-blue-700 dark:text-surface-0' : 'bg-gray-200 dark:bg-surface-800 dark:text-surface-0']" @click="filterType = 'staff'">Staff</button>
      </div>
      <!-- Ward Dropdown Filter -->
      <div class="flex gap-2 items-center">
        <span class="font-semibold text-surface-900 dark:text-surface-0">Ward:</span>
        <select v-model="selectedWardId" class="p-2 border rounded bg-white dark:bg-surface-800 dark:text-surface-0 dark:border-surface-600">
          <option value="">All Wards</option>
          <option v-for="ward in wards" :key="ward.id" :value="ward.id">{{ ward.name }} ({{ ward.code }})</option>
        </select>
      </div>
    </div>
  <div v-if="loading" class="text-center py-16 text-lg text-gray-500 dark:text-gray-400">Loading requests...</div>
  <div v-else-if="error" class="text-center py-16 text-red-500 dark:text-red-400">{{ error }}</div>
  <div v-if="filteredRequests.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">No ward requests found.</div>
    <div v-else>
      <div v-for="req in filteredRequests" :key="req.id" class="border rounded mb-4 bg-white dark:bg-surface-800 dark:border-surface-600">
        <div class="flex items-center justify-between p-4 cursor-pointer" @click="toggleExpand(req.id)">
          <div>
            <span class="font-semibold text-surface-900 dark:text-surface-0">{{ req.person ? req.person.first_name + ' ' + req.person.last_name : 'Unknown' }}</span>
            <span class="text-xs text-gray-400 dark:text-gray-300 ml-4">(ID: {{ req.person_id }})</span>
          </div>
          <button class="text-blue-600 dark:text-blue-400 hover:underline">{{ expanded[req.id] ? 'Hide' : 'Show' }} Details</button>
        </div>
        <div v-if="expanded[req.id]" class="p-4 border-t bg-gray-50 dark:bg-surface-900 dark:border-surface-700">
          <div class="mb-2">
            <span class="font-semibold text-surface-900 dark:text-surface-0">Message:</span>
            <div class="ml-2 text-gray-800 dark:text-gray-100">{{ req.message }}</div>
          </div>
          <div class="mb-2">
            <span class="font-semibold text-surface-900 dark:text-surface-0">Ward:</span>
            <span class="ml-2 text-gray-800 dark:text-gray-100">{{ req.ward ? req.ward.name + ' (' + req.ward.code + ')' : req.ward_id }}</span>
          </div>
          <div class="mb-2">
            <span class="font-semibold text-surface-900 dark:text-surface-0">Job Description:</span>
            <span class="ml-2 text-gray-800 dark:text-gray-100">{{ req.job_description }}</span>
          </div>
          <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">Submitted: {{ formatDate(req.created_at) }}</div>
          <div class="mb-2">
            <textarea v-model="adminMessages[req.id]" rows="2" class="w-full p-2 border rounded bg-white dark:bg-surface-800 dark:text-surface-0 dark:border-surface-600" placeholder="Add your message (optional)"></textarea>
          </div>
          <div class="flex gap-2">
            <button v-if="!isLeaderWithWard || (isLeaderWithWard && String(req.ward_id) === String(assignedWardId))" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-700 dark:text-surface-0 dark:hover:bg-green-800" @click.stop="respondToRequest(req, 'accept')">Accept</button>
            <button v-if="!isLeaderWithWard || (isLeaderWithWard && String(req.ward_id) === String(assignedWardId))" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-700 dark:text-surface-0 dark:hover:bg-red-800" @click.stop="respondToRequest(req, 'reject')">Reject</button>
          </div>
        </div>
      </div>
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

// --- User info for ward assignment ---
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

// --- Leader/ward detection using user object ---
const isLeaderWithWard = computed(() => {
  return user.value && user.value.role && user.value.role.toLowerCase() === 'communityleader' && user.value.ward_id && user.value.ward_name && user.value.ward_code;
});
const assignedWardId = computed(() => user.value?.ward_id);

// --- Filter logic ---
const filteredRequests = computed(() => {
  if (isLeaderWithWard.value) {
    return requests.value.filter(req => {
      const jobDesc = String(req.job_description || '').toLowerCase();
      const isStaff = !jobDesc.includes('community leader');
      return isStaff && String(req.ward_id) === String(assignedWardId.value);
    });
  }
  // Otherwise, use normal filter logic
  const result = requests.value.filter(req => {
    const jobDesc = String(req.job_description || '').toLowerCase();
    const isLeader = jobDesc.includes('community leader');
    const isStaff = !isLeader;
    if (filterType.value === 'communityleader' && !isLeader) return false;
    if (filterType.value === 'staff' && !isStaff) return false;
    if (selectedWardId.value && String(req.ward_id) !== String(selectedWardId.value) && (!req.ward || String(req.ward.id) !== String(selectedWardId.value))) return false;
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

// Send accept/reject response as a new entry in ward_requests
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
  } catch (e) {
    wards.value = [];
  }
}

onMounted(async () => {
  await fetchRequests();
  await fetchWards();
});
</script>
