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

const model = ref([
    {
        label: 'Menu',
        items: [
            // { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' },
            { label: 'Report Issue', icon: 'pi pi-fw pi-exclamation-triangle', to: { name: 'report-issue' } },
            { label: 'Reports', icon: 'pi pi-fw pi-file', to: { name: 'reports' } },
            { label: 'Your Reports', icon: 'pi pi-fw pi-list', to: { name: 'user-reports' } },
            { label: 'Map View', icon: 'pi pi-fw pi-map', to: { name: 'report-map' } },
            { label: 'Wards', icon: 'pi pi-briefcase', to: '/wards' },
            { label: 'Test CRUD', icon: 'pi pi-fw pi-database', to: { name: 'test-crud' } },
            ...(isAdmin() ? [
              { label: 'Ward Requests', icon: 'pi pi-fw pi-inbox', to: { name: 'ward-requests' } }
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
