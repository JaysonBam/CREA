<template>
  <header class="app-header surface-card border-bottom-1 surface-border">
    <div class="header-inner container mx-auto px-4">
      <!-- Left: logo -->
      <div class="brand cursor-pointer" @click="goHome" aria-label="CREA home">
        <img src="/logo_light.svg" alt="CREA" class="brand-logo" />
      </div>

      <!-- Middle: nav -->
      <nav class="main-nav hidden md:flex" aria-label="Primary">
        <a class="nav-link" href="#features">Features</a>
        <a class="nav-link" href="#how">How it works</a>
      </nav>

      <!-- Right: auth -->
      <div class="auth-actions">
        <Button
          label="Log in"
          class="p-button-text auth-link"
          @click="router.push({ name: 'login' })"
        />
        <Button
          label="Sign up"
          class="p-button-rounded signup-cta"
          @click="router.push({ name: 'register' })"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import Button from "primevue/button";
const router = useRouter();
const goHome = () => router.push({ name: "landing" });
</script>

<style scoped>
/* ---------- Shell ---------- */
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: saturate(140%) blur(8px);
}
.header-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  height: 4.75rem; /* taller bar */
  gap: 1rem;
}

/* ---------- Brand ---------- */
/* Make logo a touch smaller so text feels proportionate */
.brand {
  display: flex;
  align-items: center;
}
.brand-logo {
  height: 2rem; /* was ~2.75rem */
  width: auto;
  display: block;
}

/* ---------- Nav (centered) ---------- */
.main-nav {
  justify-self: center;
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

/* Big, confident nav. Scales with viewport, capped for readability */
.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 2.5rem;
  padding: 0 0.4rem;
  font-weight: 700;
  font-size: clamp(1.05rem, 0.9rem + 0.6vw, 1.25rem);
  letter-spacing: 0.01em;
  color: var(--text-color-secondary);
  transition:
    color 0.15s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
  outline: none;
}

/* Animated underline + tiny rise on hover */
.nav-link::after {
  content: "";
  position: absolute;
  left: 0.4rem;
  right: 0.4rem;
  bottom: 0.35rem;
  height: 2px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: center;
  opacity: 0;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.nav-link:hover {
  color: var(--text-color);
  transform: translateY(-1px);
}
.nav-link:hover::after {
  transform: scaleX(1);
  opacity: 0.9;
}
.nav-link:focus-visible {
  border-radius: 0.5rem;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary-color), #000 10%);
}

/* ---------- Auth (right) ---------- */
.auth-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-self: end;
  white-space: nowrap;
}

/* Log in: readable, link-like but bigger */
.auth-link {
  font-size: clamp(1rem, 0.9rem + 0.4vw, 1.125rem);
  font-weight: 700;
  padding: 0.25rem 0.5rem;
}

/* Sign up: strong pill CTA with a hint of depth */
.signup-cta :deep(.p-button-label) {
  font-size: clamp(1rem, 0.9rem + 0.45vw, 1.15rem);
  font-weight: 800;
  letter-spacing: 0.01em;
}
.signup-cta {
  padding: 0.25rem 0.25rem; /* tighten PrimeVue default */
  border-radius: 999px !important;
  box-shadow: 0 6px 18px -8px
    color-mix(in oklab, var(--primary-color), #000 20%);
}
.signup-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -10px
    color-mix(in oklab, var(--primary-color), #000 18%);
}

/* ---------- Responsive ---------- */
@media (min-width: 1280px) {
  .header-inner {
    height: 5rem;
  }
  .main-nav {
    gap: 2rem;
  }
}
@media (max-width: 767px) {
  .main-nav {
    display: none;
  } /* keep mobile simple */
  .brand-logo {
    height: 1.75rem;
  }
  .header-inner {
    gap: 0.75rem;
    height: 4.25rem;
  }
}
</style>
