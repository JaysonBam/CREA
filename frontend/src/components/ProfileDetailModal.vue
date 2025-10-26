<template>
  <!-- User profile details and avatar -->
    <div class="flex flex-col gap-6 items-start w-full user-info">
      <div class="flex flex-col items-start">
        <!-- Name and role (avatar removed because users don't have profile pictures) -->
        <div class="text-2xl font-bold mb-1">{{ user.first_name }} {{ user.last_name }}</div>
        <div class="text-primary font-medium capitalize mb-2">{{ user.role }}</div>
        <!-- Active status removed per request -->
      </div>
      <!-- User info fields (single column) -->
      <div class="w-full flex flex-col gap-4">
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">{{ user.email }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone</span>
        <span class="info-value">{{ user.phone }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">User ID</span>
        <span class="info-value">{{ user.id }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Created</span>
        <span class="info-value">{{ formatDate(user.createdAt) }}</span>
      </div>
      <div class="info-row no-border">
        <span class="info-label">Updated</span>
        <span class="info-value">{{ formatDate(user.updatedAt) }}</span>
      </div>
  <!-- Ward assignment and request chain for non-admins -->
  <WardAssignmentModal v-if="user.role !== 'admin'" :user="user" @profile-updated="onProfileUpdated" />
      <div v-if="user.role === 'staff' || user.role === 'communityleader'" class="mt-6 w-full">
        <WardRequestChain :userId="user.id" />
      </div>
      </div>
    </div>
</template>

<script setup>
import WardAssignmentModal from './WardAssignmentModal.vue';
import WardRequestChain from './WardRequestChain.vue';
// Expects a user
const props = defineProps({
  user: { type: Object, required: true }
});
const emit = defineEmits(['profile-updated']);

function onProfileUpdated() {
  // Re-emit upward so the top-level Profile view can refresh from server
  emit('profile-updated');
}
// Format date
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}
</script>

<style scoped>
/* Responsive profile layout tweaks */
.user-info { width: 100%; }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--surface-border); }
.info-row.no-border { border-bottom: none; padding-bottom: 0; }
.info-label { color: var(--text-color-secondary); font-weight: 600; }
.info-value { color: var(--text-color); }

@media (max-width: 767px) {
  /* Stack label + value vertically on small screens to avoid truncation */
  .info-row { flex-direction: column; align-items: flex-start; }
  .info-label { font-size: 0.9rem; }
  .info-value { font-size: 1rem; font-weight: 600; }
  /* Center the user info container and limit its max width for better readability */
  .user-info { max-width: 480px; margin-left: auto; margin-right: auto; }
  /* Slightly reduce main name size on small screens */
  .text-2xl { font-size: 1.25rem; }
}
</style>