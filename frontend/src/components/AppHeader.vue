<template>
  <header class="app-header surface-card border-bottom-1 surface-border">
    <div class="container mx-auto px-4 h-4rem flex align-items-center justify-content-between">
      <!-- Left: logo -->
      <div class="brand cursor-pointer" @click="goHome">
        <img src="/logo_light.svg" alt="CREA" class="brand-logo" />
      </div>

      <!-- Middle: nav -->
      <nav class="main-nav hidden md:flex">
        <a class="nav-link" href="#features">Features</a>
        <a class="nav-link" href="#how">How it works</a>
        <a class="nav-link" href="#testimonials">Testimonials</a>
      </nav>

      <!-- Right: auth -->
      <div class="auth-actions flex align-items-center gap-2">
        <Button label="Log in" class="p-button-text" @click="router.push({ name: 'login' })" />
        <Button label="Sign up" class="p-button-rounded" @click="router.push({ name: 'register' })" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
const router = useRouter()
const goHome = () => router.push({ name: 'landing' })
</script>

<style scoped>
.app-header {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: saturate(140%) blur(8px);
}

/* --- Left: bigger logo + breathing room before nav --- */
.brand { display:flex; align-items:center; }
.brand-logo{
  height: 2.75rem;      /* base height */
  width: auto;
  display: block;
  transform: scale(0.6);          /* bump size */
  transform-origin: left center;  /* grow to the right */
}
/* create clear gap between logo and the first tab */
.main-nav { display:flex; align-items:center; gap: 1.5rem; margin-left: 2rem; }

/* --- Tabs: bigger text + larger click targets --- */
.nav-link {
  display: inline-flex; align-items: center;
  height: 2.5rem;               /* taller click target */
  padding: 0 .25rem;             /* small horizontal pad */
  font-size: 1.0625rem;          /* ~17px on default 16px root */
  font-weight: 600;
  line-height: 1;
  color: var(--text-color-secondary);
  transition: color .15s ease, opacity .15s ease;
}
.nav-link:hover { color: var(--text-color); opacity: .95; }

/* Keep auth buttons on one line on desktop */
.auth-actions { white-space: nowrap; }
@media (min-width: 1280px) {
  .main-nav { gap: 2rem; margin-left: 2.5rem; }
  .nav-link { font-size: 1.125rem; }  /* bigger on wide screens */
}
</style>
