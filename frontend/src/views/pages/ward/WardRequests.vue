<template>
  <div class="card p-6 md:p-8 lg:p-10">
    <h1 class="text-2xl font-bold mb-6">Ward Requests</h1>
    <div v-if="loading" class="text-center py-16 text-lg text-gray-500">Loading requests...</div>
    <div v-else-if="error" class="text-center py-16 text-red-500">{{ error }}</div>
    <div v-if="requests.length === 0" class="text-center py-8 text-gray-500">No ward requests found.</div>
    <div v-else>
      <div v-for="req in requests" :key="req.id" class="border rounded mb-4 bg-white">
        <div class="flex items-center justify-between p-4 cursor-pointer" @click="toggleExpand(req.id)">
          <div>
            <span class="font-semibold">{{ req.person ? req.person.first_name + ' ' + req.person.last_name : 'Unknown' }}</span>
            <span class="text-xs text-gray-400 ml-4">(ID: {{ req.person_id }})</span>
          </div>
          <button class="text-blue-600 hover:underline">{{ expanded[req.id] ? 'Hide' : 'Show' }} Details</button>
        </div>
        <div v-if="expanded[req.id]" class="p-4 border-t bg-gray-50">
          <div class="mb-2">
            <span class="font-semibold">Message:</span>
            <div class="ml-2 text-gray-800">{{ req.message }}</div>
          </div>
          <div class="mb-2">
            <span class="font-semibold">Ward:</span>
            <span class="ml-2 text-gray-800">{{ req.ward ? req.ward.name + ' (' + req.ward.code + ')' : req.ward_id }}</span>
          </div>
          <div class="mb-2">
            <span class="font-semibold">Job Description:</span>
            <span class="ml-2 text-gray-800">{{ req.job_description }}</span>
          </div>
          <div class="mb-2 text-sm text-gray-500">Submitted: {{ formatDate(req.created_at) }}</div>
          <div class="mb-2">
            <textarea v-model="adminMessages[req.id]" rows="2" class="w-full p-2 border rounded" placeholder="Add your message (optional)"></textarea>
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" @click.stop="respondToRequest(req, 'accept')">Accept</button>
            <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" @click.stop="respondToRequest(req, 'reject')">Reject</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { get, post } from '@/utils/api';

const requests = ref([]);
const loading = ref(true);
const error = ref(null);
const expanded = ref({});
const adminMessages = ref({});

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
    alert('Response submitted!');
    adminMessages.value[req.id] = '';
    expanded.value[req.id] = false;
  } catch (e) {
    alert(e?.response?.data?.message || e?.message || 'Failed to submit response.');
  }
}

onMounted(async () => {
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
});
</script>
