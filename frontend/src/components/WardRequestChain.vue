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
  <div v-for="req in requests" :key="req.id" class="rounded-lg border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-surface-0 shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <i class="pi pi-calendar"></i>
            <span>{{ formatDate(req.created_at || req.createdAt || req.updated_at || req.updatedAt, 'date') }} {{ formatDate(req.created_at || req.createdAt || req.updated_at || req.updatedAt, 'time') }}</span>
          </span>
      <span class="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
        :class="req.type === 'accept' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : req.type === 'reject' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' : req.type === 'leave' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'">
            {{ req.type.charAt(0).toUpperCase() + req.type.slice(1) }}
          </span>
        </div>
        <div class="text-gray-800 dark:text-gray-100"><span class="font-semibold">Message:</span> {{ req.message }}</div>
        <div v-if="req.ward" class="text-gray-600 dark:text-gray-300 text-sm"><span class="font-semibold">Ward:</span> {{ req.ward.name }} ({{ req.ward.code }})</div>
        <div v-if="req.job_description" class="text-gray-600 dark:text-gray-300 text-sm"><span class="font-semibold">Job Description:</span> {{ req.job_description }}</div>
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
function formatDate(date, part = 'full') {
  if (!date) return '';
  const d = new Date(date);
  if (part === 'date') return d.toLocaleDateString();
  if (part === 'time') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString();
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