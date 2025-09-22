<template>
  <div class="mt-4">
    <div class="font-bold text-lg mb-3 text-primary flex items-center gap-2">
      <i class="pi pi-comments text-primary"></i>
      Ward Request Message Chain
    </div>
    <div v-if="loading" class="text-gray-400 italic">Loading...</div>
    <div v-else-if="error" class="text-red-500">{{ error }}</div>
    <div v-else-if="requests.length === 0" class="text-gray-400 italic">No ward requests found.</div>
    <div v-else class="space-y-3">
      <div v-for="req in requests" :key="req.id" class="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500"><i class="pi pi-calendar"></i> {{ formatDate(req.created_at) }}</span>
          <span class="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
                :class="req.type === 'accept' ? 'bg-green-100 text-green-700' : req.type === 'reject' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
            {{ req.type.charAt(0).toUpperCase() + req.type.slice(1) }}
          </span>
        </div>
        <div class="text-gray-800"><span class="font-semibold">Message:</span> {{ req.message }}</div>
        <div v-if="req.ward" class="text-gray-600 text-sm"><span class="font-semibold">Ward:</span> {{ req.ward.name }} ({{ req.ward.code }})</div>
        <div v-if="req.job_description" class="text-gray-600 text-sm"><span class="font-semibold">Job Description:</span> {{ req.job_description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getWardRequestChain } from '@/utils/ward_request_helper';
const props = defineProps({ userId: { type: [String, Number], required: true } });
const requests = ref([]);
const loading = ref(true);
const error = ref('');
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}
onMounted(async () => {
  try {
    const res = await getWardRequestChain(props.userId);
    requests.value = res;
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load ward requests';
  } finally {
    loading.value = false;
  }
});
</script>