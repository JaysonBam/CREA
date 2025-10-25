<script setup>
import { ref, onMounted, computed } from 'vue';
import { get } from '@/utils/api';

import AppMenuItem from './AppMenuItem.vue';

function isAdmin() {
    const token = sessionStorage.getItem('JWT');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'admin';
    } catch {
        return false;
    }
}

function canChangeStates() {
    const token = sessionStorage.getItem('JWT');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'admin' || payload.role === 'staff' || payload.role === 'communityleader';
    } catch {
        return false;
    }
}


const user = ref(null);
const loadingUser = ref(true);

function isCommunityLeader() {
    return user.value && user.value.role && user.value.role.toLowerCase() === 'communityleader';
}

function isMunicipalStaff() {
    return user.value && user.value.role && user.value.role.toLowerCase() === 'staff';
}

function hasAssignedWard() {
    // Use same logic as WardAssignmentModal
    return user.value && user.value.ward_id && user.value.ward_name && user.value.ward_code;
}

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

const model = computed(() => [{
    label: 'Menu',
    items: [
        { label: 'Report Issue', icon: 'pi pi-fw pi-exclamation-triangle', to: { name: 'report-issue' } },
        { label: 'Reports', icon: 'pi pi-fw pi-file', to: { name: 'reports' } },
        { label: 'Your Reports', icon: 'pi pi-fw pi-list', to: { name: 'user-reports' } },
        { label: 'Map View', icon: 'pi pi-fw pi-map', to: { name: 'report-map' } },
        { label: 'Wards', icon: 'pi pi-map-marker', to: '/wards' },
        ...(isCommunityLeader()
            ? [{ label: 'Manage Report Issue', icon: 'pi pi-exclamation-circle', to: '/my-ward-report-issues' }]
            : []),
        ...(isCommunityLeader()
            ? [{ label: 'Staff Workload', icon: 'pi pi-users', to: { name: 'staff-workload' } }]
            : []),
        ...(isAdmin() ? [
            { label: 'Ward Requests', icon: 'pi pi-fw pi-inbox', to: { name: 'ward-requests' } }
        ] :
        (isCommunityLeader() && hasAssignedWard() ? [
            { label: 'Ward Requests', icon: 'pi pi-fw pi-inbox', to: { name: 'ward-requests' } }
        ] : [])),

        ...(isMunicipalStaff()
            ? [{ label: 'My Work', icon: 'pi pi-exclamation-circle', to: '/staff-my-work' }]
            : []),

        
        // ...(canChangeStates() ? [
        //     { label: 'Status Updates', icon: 'pi pi-fw pi-globe', to: { name: 'state-updates' } }
        // ] : [])
    ]
}]);

</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
