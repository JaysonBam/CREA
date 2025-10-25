<script setup>
import { ref, onMounted } from 'vue';
import ProfileDetailModal from '@/components/ProfileDetailModal.vue';
import { get } from '@/utils/api';

const user = ref(null);
const loading = ref(true);
const error = ref(null);

async function fetchProfile() {
    loading.value = true;
    error.value = null;
    try {
        const res = await get('/api/auth/me');
        if (res.data && res.data.success) {
            user.value = res.data.user;
        } else {
            error.value = 'Failed to fetch profile info';
        }
    } catch (e) {
        error.value = 'Failed to fetch profile info';
    } finally {
        loading.value = false;
    }
}

onMounted(fetchProfile);
</script>

<template>
    <!-- display on profile modal -->
    <div class="card p-6 md:p-8 lg:p-10">
        <h1 class="text-2xl font-bold mb-6">My Profile</h1>
        <div v-if="loading" class="text-center py-16 text-lg text-gray-500">Loading profile...</div>
        <div v-else-if="error" class="text-center py-16 text-red-500">{{ error }}</div>
    <ProfileDetailModal v-else :user="user" @profile-updated="fetchProfile" />
    </div>
</template>
