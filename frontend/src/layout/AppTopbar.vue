<script setup>
import { useLayout } from "@/layout/composables/layout";
import AppConfigurator from "./AppConfigurator.vue";
import { ref } from "vue";
import { useRouter } from 'vue-router';
const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
//Jayden
//I am using the overlayMenu from the template under "menu" and prettier for formatting

const menu = ref(null);
const router = useRouter();

const overlayProfileMenuItems = ref([
  {
    label: "Profile",
    icon: "pi pi-user",
    command: () => {
      router.push({ name: 'profile' });
    },
  },
  {
    label: "Logout",
    icon: "pi pi-sign-out",
    command: () => {
      sessionStorage.clear();
      router.push({ name: "login" });
    },
  },
]);

const toggleProfileMenu = (event) => {
  menu.value.toggle(event);
};
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button
        class="layout-menu-button layout-topbar-action"
        @click="toggleMenu"
      >
        <i class="pi pi-bars"></i>
      </button>
      <router-link to="/" class="layout-topbar-logo flex items-center gap-4 min-w-0 py-1" style="height: 48px;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
          <rect width="24" height="24" rx="12" fill="#2563eb"/>
          <path d="M7 8.5C7 7.11929 8.11929 6 9.5 6H14.5C15.8807 6 17 7.11929 17 8.5V13.5C17 14.8807 15.8807 16 14.5 16H10.4142C10.149 16 9.89464 16.1054 9.70711 16.2929L8.35355 17.6464C8.15829 17.8417 7.84171 17.8417 7.64645 17.6464C7.45118 17.4512 7.45118 17.1346 7.64645 16.9393L8.29289 16.2929C8.10536 16.1054 8 15.851 8 15.5858V8.5Z" fill="#fff"/>
          <path d="M11 11.5L12.5 13L15 10.5" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="font-bold text-lg md:text-2xl lg:text-3xl block whitespace-nowrap" style="max-width: 80vw;">
          Community Reporting and Engagement App
        </span>
      </router-link>
    </div>

    <div class="layout-topbar-actions">
      <button
        type="button"
        class="layout-topbar-action"
        @click="toggleDarkMode"
      >
        <i
          :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"
        ></i>
      </button>
      <button
        type="button"
        class="layout-topbar-action"
        @click="toggleProfileMenu"
      >
        <i class="pi pi-user"></i>
        <span>Profile</span>
      </button>
      <Menu ref="menu" :model="overlayProfileMenuItems" :popup="true" />
    </div>
  </div>
</template>
