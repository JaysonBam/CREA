<template>
  <div class="card">
    <h2 class="mb-3">Ward Statistics</h2>
    <p><strong>Ward ID:</strong> {{ wardId }}</p>

    <div v-if="loading">Loading statistics...</div>
    <div v-else>
      <ul class="list-disc pl-6">
        <li><strong>Open Issues:</strong> {{ stats.open }}</li>
        <li><strong>Closed Issues:</strong> {{ stats.closed }}</li>
        <li><strong>Pending Issues:</strong> {{ stats.pending }}</li>
        <li><strong>Average Resolution Time:</strong> {{ stats.avgResolution }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const props = defineProps({
  wardId: {
    type: String,
    required: true,
  },
});

const stats = ref({});
const loading = ref(true);

onMounted(async () => {
  // TODO: Replace with backend fetch
  loading.value = true;
  try {
    stats.value = {
      open: 5,
      closed: 12,
      pending: 3,
      avgResolution: "2.5 days",
    };
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.card {
  padding: 1.5rem;
}
</style>
