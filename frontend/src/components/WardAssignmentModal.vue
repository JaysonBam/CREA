<template>
  <div class="mt-8 p-4 rounded-lg bg-gray-50 border border-gray-200">
    <!-- Show assigned ward if available -->
    <div v-if="assignedWard">
      <div class="font-semibold text-lg mb-2">Assigned Ward</div>
      <div class="text-primary text-base">{{ wardDisplay }}</div>

      <!-- Leave ward button for staff / community leaders -->
      <div v-if="props.user.role === 'staff' || props.user.role === 'communityleader'" class="mt-3">
        <Button class="w-40 p-button-danger" label="Leave ward" @click="showLeaveConfirm = true" />
      </div>

      <!-- Confirm leave flow -->
      <div v-if="showLeaveConfirm" class="mt-3 p-3 border rounded bg-white">
        <div class="text-sm text-gray-600 mb-2">Type <strong>CONFIRM</strong> to enable leaving this ward.</div>
        <input v-model="leaveConfirmText" type="text" class="w-full p-2 border rounded mb-2" placeholder="Type CONFIRM to proceed" />
        <div class="flex gap-2">
          <Button :disabled="leaveConfirmText !== 'CONFIRM' || leaving" label="Leave Ward" class="p-button-danger" @click="submitLeaveRequest" />
          <Button label="Cancel" class="p-button-secondary" @click="() => { showLeaveConfirm = false; leaveConfirmText = ''; leaveMessage = ''; }" />
        </div>
        <div v-if="leaveMessage" class="mt-2 text-sm text-green-600">{{ leaveMessage }}</div>
      </div>
    </div>
    <!-- Show request form if user can request a ward -->
    <template v-else-if="canRequestWard">
      <div class="font-semibold text-lg mb-2">Request to Join a Ward</div>
      <Dropdown
        v-model="selectedWard"
        :options="wards"
        optionLabel="name"
        optionValue="code"
        placeholder="Select a ward"
        class="w-full md:w-96 mb-2"
        :loading="wardsLoading"
        :disabled="wardsLoading"
      />
      <textarea v-model="motivation" rows="3" class="w-full p-2 border rounded mb-2" placeholder="Write your motivation..."></textarea>
      <div v-if="props.user.role === 'staff'">
        <input v-model="jobDescription" type="text" class="w-full p-2 border rounded mb-2" placeholder="Enter your job description" />
      </div>
      <Button label="Submit Request" class="w-full" :disabled="!selectedWard || !motivation || (props.user.role === 'staff' && !jobDescription) || wardsLoading" @click="submitRequest" />
      <div v-if="requestMessage" class="mt-2 text-green-600">{{ requestMessage }}</div>
      <div v-if="wardsError" class="mt-2 text-red-500">{{ wardsError }}</div>
    </template>
    <!-- Fallback if no ward assigned and cannot request -->
    <div v-else class="text-gray-500">No ward assigned.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { getAllWards } from '@/utils/ward_helper';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import { post } from '@/utils/api';

// Expects a user
const props = defineProps({
  user: { type: Object, required: true }
});

// States
const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref('');
const selectedWard = ref('');
const motivation = ref('');
const jobDescription = ref('');
const requestMessage = ref('');
// Local state for assigned ward so we can reflect immediate 'leave' UX
const assignedWard = ref(null);
const showLeaveConfirm = ref(false);
const leaveConfirmText = ref('');
const leaveMessage = ref('');
const leaving = ref(false);

// Compute assigned ward from user prop
const ward = computed(() => {
  // Use ward_id as the indicator for assignment
  if (props.user.ward_id && props.user.ward_name && props.user.ward_code) {
    return {
      id: props.user.ward_id,
      name: props.user.ward_name,
      code: props.user.ward_code,
    };
  }
  return null;
});

// Initialize assignedWard from computed ward and keep in sync
assignedWard.value = ward.value;
watch(ward, (v) => {
  assignedWard.value = v;
});

// Display string for assigned ward
const wardDisplay = computed(() => {
  const w = assignedWard.value || ward.value;
  if (w) {
    return `${w.name} (${w.code})`;
  }
  return null;
});

// Can the user request a ward?
const canRequestWard = computed(() => {
  // Only staff or communityleader, and only if not already assigned a ward
  const role = props.user.role;
  return (
    (role === 'staff' || role === 'communityleader') && !assignedWard.value
  );
});

// Load wards on mount if user can request
onMounted(async () => {
  if (canRequestWard.value) {
    try {
      wardsLoading.value = true;
      const res = await getAllWards();
      wards.value = Array.isArray(res?.data?.data) ? res.data.data : [];
    } catch (e) {
      wardsError.value = e?.response?.data?.message || e?.message || 'Failed to load wards';
    } finally {
      wardsLoading.value = false;
    }
  }
});

// Submit ward join request
async function submitRequest() {
  try {
    //if staff get description
    requestMessage.value = '';
    let jobDesc = '';
    if (props.user.role === 'staff') {
      jobDesc = jobDescription.value || 'staff description';
    // if leader just use community leader
    } else if (props.user.role === 'communityleader') {
      jobDesc = 'community leader';
    }

    //post reqeust
    const res = await post('/api/ward-requests', {
      message: motivation.value,
      type: 'request',
      ward_id: wards.value.find(w => w.code === selectedWard.value)?.id,
      job_description: jobDesc,
    });
    if (res.data && res.data.success) {
      requestMessage.value = 'Ward join request submitted!';
      motivation.value = '';
      selectedWard.value = '';
      jobDescription.value = '';
    } else {
      requestMessage.value = 'Failed to submit request.';
    }
  } catch (e) {
    requestMessage.value = e?.response?.data?.message || e?.message || 'Failed to submit request.';
  }
}

// Leave ward request flow (UI + API call)
async function submitLeaveRequest() {
  if (!assignedWard.value) return;
  if (leaveConfirmText.value !== 'CONFIRM') return;
  try {
    leaving.value = true;
    leaveMessage.value = '';
    const res = await post('/api/ward-requests', {
      message: 'Request to leave ward',
      type: 'leave',
      ward_id: assignedWard.value.id,
    });
    if (res.data && res.data.success) {
      // reflect immediate UX: user is back to unassigned state
      assignedWard.value = null;
      showLeaveConfirm.value = false;
      leaveConfirmText.value = '';
      leaveMessage.value = 'Leave request submitted. You are now unassigned.';
    } else {
      leaveMessage.value = 'Failed to submit leave request.';
    }
  } catch (e) {
    leaveMessage.value = e?.response?.data?.message || e?.message || 'Failed to submit leave request.';
  } finally {
    leaving.value = false;
  }
}
</script>
