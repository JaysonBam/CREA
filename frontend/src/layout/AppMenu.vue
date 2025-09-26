<script setup>
import { ref } from 'vue';

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

function isCommunityLeader() {
  return (sessionStorage.getItem('role') || '').toLowerCase() === 'communityleader'
}

const model = ref([
    {
        label: 'Menu',
        items: [
            // { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' },
            { label: 'Report Issue', icon: 'pi pi-fw pi-exclamation-triangle', to: { name: 'report-issue' } },
            { label: 'Reports', icon: 'pi pi-fw pi-file', to: { name: 'reports' } },
            { label: 'Your Reports', icon: 'pi pi-fw pi-list', to: { name: 'user-reports' } },
            { label: 'Map View', icon: 'pi pi-fw pi-map', to: { name: 'report-map' } },
            { label: 'Wards', icon: 'pi pi-map-marker', to: '/wards' },
             ...(isCommunityLeader()
            ? [{ label: 'Manage Report Issue', icon: 'pi pi-exclamation-circle', to: '/my-ward-report-issues' },]
            : []),
            ...(isCommunityLeader()
            ? [{ label: 'Staff Workload', icon: 'pi pi-users', to: { name: 'staff-workload' } }]
            : []),
            { label: 'Test CRUD', icon: 'pi pi-fw pi-database', to: { name: 'test-crud' } },
            ...(isAdmin() ? [
              { label: 'Ward Requests', icon: 'pi pi-fw pi-inbox', to: { name: 'ward-requests' } }
            ] : []),
            ...(canChangeStates() ? [
                { label: 'Status Updates', icon: 'pi pi-fw pi-globe', to: { name: 'state-updates' } }
            ] : [])
        ]
    }
]);
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
