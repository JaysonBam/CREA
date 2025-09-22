

<template>
  <div class="card">
    <h2 class="mb-3">Ward Profile</h2>
    <p><strong>Ward ID:</strong> {{ wardId }}</p>

    <div v-if="loading">Loading ward details...</div>
    <div v-else>
      <p><strong>Name:</strong> {{ ward.name || "Unknown" }}</p>
      <p><strong>Leader:</strong> {{ ward.leader || "Unassigned" }}</p>
      <p><strong>Staff Count:</strong> {{ ward.staff?.length || 0 }}</p>
      <p><strong>Issues Summary:</strong> {{ ward.issuesSummary || "N/A" }}</p>
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

const ward = ref({});
const loading = ref(true);

onMounted(async () => {
  // TODO: Replace with actual backend fetch
  loading.value = true;
  try {
    // Simulate data fetch
    ward.value = {
      id: props.wardId,
      name: "Example Ward",
      leader: "Leader Name",
      staff: ["Staff A", "Staff B"],
      issuesSummary: "5 open issues, 12 resolved",
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