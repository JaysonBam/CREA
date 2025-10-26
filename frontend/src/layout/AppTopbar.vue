<!-- AppTopbar.vue -->
<script setup>
import { useLayout } from "@/layout/composables/layout";
import { ref, onBeforeMount, computed } from "vue";
import { useRouter } from "vue-router";
import { updateAppearance } from "@/utils/backend_helper";

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const menu = ref(null);
const router = useRouter();

const overlayProfileMenuItems = ref([
  {
    label: "Profile",
    icon: "pi pi-user",
    command: () => router.push({ name: "profile" }),
  },
  {
    label: "Logout",
    icon: "pi pi-sign-out",
    command: () => {
      sessionStorage.clear();
      window.location.href = "/";
    },
  },
]);

// Ensure correct theme before first paint
onBeforeMount(() => {
  const appearance = sessionStorage.getItem("appearance") || "light";
  const shouldBeDark = appearance === "dark";
  if (shouldBeDark !== isDarkTheme.value) toggleDarkMode();
});

// Reactive logo based on theme
const logoSrc = computed(() =>
  isDarkTheme.value ? "/logo_dark.svg" : "/logo_light.svg"
);

// Toggle handler: compute next theme BEFORE toggling
const handleThemeToggle = async () => {
  const nextAppearance = isDarkTheme.value ? "light" : "dark";
  toggleDarkMode();
  sessionStorage.setItem("appearance", nextAppearance);
  try {
    await updateAppearance(nextAppearance);
  } catch (err) {
    console.error("Failed to update appearance:", err);
  }
};

const toggleProfileMenu = (event) => {
  menu.value?.toggle(event);
};
</script>

<template>
  <div class="layout-topbar">
    <div class="layout-topbar-logo-container">
      <button
        class="layout-menu-button layout-topbar-action"
        @click="toggleMenu"
        aria-label="Toggle menu"
      >
        <i class="pi pi-bars"></i>
      </button>

      <router-link
        to="/"
        class="layout-topbar-logo flex items-center gap-4 min-w-0 py-1"
        style="height: 48px"
      >
        <img
          :src="logoSrc"
          alt="Logo"
          class="topbar-logo block shrink-0"
        />
      </router-link>
    </div>

    <div class="layout-topbar-actions">
      <button
        type="button"
        class="layout-topbar-action"
        @click="handleThemeToggle"
        aria-label="Toggle dark mode"
      >
        <i
          :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"
        ></i>
      </button>

      <button
        type="button"
        class="layout-topbar-action profile-button"
        @click="toggleProfileMenu"
        aria-label="Open profile menu"
      >
        <i class="pi pi-user"></i>
        <span class="profile-label">Profile</span>
      </button>

      <Menu ref="menu" :model="overlayProfileMenuItems" :popup="true" />
    </div>
  </div>
</template>

<style scoped>
.layout-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 1rem;
  height: 64px;
}

.layout-topbar-logo-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.layout-topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.layout-topbar-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  padding: 0.5rem;
  cursor: pointer;
}


/* make logo and actions friendlier on small screens only; keep desktop unchanged */
.topbar-logo {
  /* Keep desktop logo large and readable (do not affect desktop layout) */
  height: 48px;
  width: auto;
  object-fit: contain;
}

.profile-label {
  margin-left: 0.35rem;
}

@media (max-width: 767px) {
  .layout-topbar {
    padding-inline: 0.5rem;
    height: 56px;
  }
  .layout-topbar-logo {
    gap: 0.5rem;
  }
  .layout-topbar-logo .topbar-logo {
    max-width: 120px;
    height: 32px;
  }
  /* Hide profile text on small screens (use icon only) */
  .profile-label {
    display: none;
  }
  /* Reduce spacing for actions on mobile */
  .layout-topbar-actions {
    gap: 0.25rem;
  }
  .layout-topbar-action {
    padding: 0.4rem;
    font-size: 0.95rem;
  }
}
</style>
