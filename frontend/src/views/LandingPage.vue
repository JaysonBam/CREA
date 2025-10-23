<!-- src/pages/LandingPage.vue -->
<template>
  <div class="landing-page">
    <AppHeader />

    <!-- ===== HERO ===== -->
    <section class="hero">
      <div class="container mx-auto px-4">
        <!-- Decorative background -->
        <div class="hero-art" aria-hidden="true">
          <div class="blob blob-a"></div>
          <div class="blob blob-b"></div>
        </div>

        <div class="hero-copy">
          <div class="eyebrow">The better way to keep communities moving</div>

          <!-- Slack-like headline -->
          <h1 class="display">
            <span class="part part-where">Fixing</span>

            <!-- Rotator slot: width animates from first -> longest. 
                 We DO NOT set width until measured, so it never collapses to 0. -->
            <span
              class="accent-wrap"
              ref="wrapRef"
              :style="
                measured
                  ? { width: isAnimating ? longestWidthPx : firstWidthPx }
                  : {}
              "
            >
              <!-- While NOT measured, render a fallback inline word to give natural width -->
              <span v-if="!measured" class="accent-fallback">{{
                currentWord
              }}</span>

              <!-- After measured, render the animated word absolutely so it doesn’t affect layout -->
              <template v-else>
                <Transition name="slack-slide">
                  <span :key="currentWord" class="accent-rotating">{{
                    currentWord
                  }}</span>
                </Transition>
              </template>
            </span>

            <span class="part part-happens">together</span>

            <!-- Hidden measurers OUTSIDE the width-controlled wrapper (never 0) -->
            <span class="measure-lab">
              <span ref="measureFirstRef" class="accent-measure">{{
                firstWord
              }}</span>
              <span ref="measureLongestRef" class="accent-measure">{{
                longestWord
              }}</span>
            </span>
          </h1>

          <p class="lead">
            CREA connects residents, ward teams and city operations in one
            place—report, assign and resolve issues fast. Less chaos, more
            progress.
          </p>

          <div class="cta-row">
            <Button
              label="Get started"
              class="p-button-rounded p-button-lg primary-cta"
              @click="router.push({ name: 'register' })"
            />
            <Button
              label="See how it works"
              class="p-button-outlined p-button-lg"
              @click="scrollToHow"
            />
          </div>

          <div class="meta-row">
            <div class="rating">
              <Rating v-model="rating" :cancel="false" readonly />
              <span class="rating-text"
                >4.8/5 from municipalities & residents</span
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== HOW IT WORKS ===== -->
    <section id="how" class="how">
      <div class="container mx-auto px-4">
        <div class="timeline">
          <div class="t-item">
            <div class="t-dot"><span>1</span></div>
            <div class="t-card">
              <h4>Report</h4>
              <p>Residents snap a photo, add a pin, pick a ward, hit submit.</p>
            </div>
          </div>

          <div class="t-connector" aria-hidden="true"></div>

          <div class="t-item">
            <div class="t-dot"><span>2</span></div>
            <div class="t-card">
              <h4>Assign</h4>
              <p>
                Leaders add staff, set priority & SLA, and schedule maintenance.
              </p>
            </div>
          </div>

          <div class="t-connector" aria-hidden="true"></div>

          <div class="t-item">
            <div class="t-dot"><span>3</span></div>
            <div class="t-card">
              <h4>Resolve</h4>
              <p>Staff update on-site; subscribers get live notifications.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FEATURES ===== -->
    <section id="features" class="features">
      <div class="container mx-auto px-4">
        <div class="features-head">
          <h2>Everything you need to keep your city running</h2>
          <p class="features-sub">
            From reporting and collaboration to scheduling and
            accountability—CREA brings residents, staff and leaders into one
            shared workflow.
          </p>
        </div>

        <div class="features-grid">
          <!-- Register as Resident, Staff or Municipal Leader -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-users"></i></div>
            <div class="f-body">
              <h3 class="f-title">Role-based onboarding</h3>
              <p class="f-text">
                Register as <strong>Resident</strong>, <strong>Staff</strong>,
                or <strong>Municipal Leader</strong> to get the right tools from
                day one.
              </p>
              <div class="f-chips">
                <span>Residents</span><span>Staff</span><span>Leaders</span>
              </div>
            </div>
          </div>

          <!-- Report Issues -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-flag"></i></div>
            <div class="f-body">
              <h3 class="f-title">Report issues in seconds</h3>
              <p class="f-text">
                Capture <strong>title</strong>, <strong>description</strong>,
                <strong>photos</strong>, and precise
                <strong>location & ward</strong>—all in one flow.
              </p>
              <div class="f-chips">
                <span>Potholes</span><span>Leaks</span><span>Streetlights</span>
              </div>
            </div>
          </div>

          <!-- Vote to escalate issues -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-arrow-up-right"></i></div>
            <div class="f-body">
              <h3 class="f-title">Community escalation</h3>
              <p class="f-text">
                Residents <strong>vote</strong> to highlight urgent issues so
                teams can prioritise where it matters most.
              </p>
              <div class="f-chips">
                <span>Priority</span><span>Transparency</span>
              </div>
            </div>
          </div>

          <!-- Threads/chats on a report issue -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-comments"></i></div>
            <div class="f-body">
              <h3 class="f-title">Threads & chat</h3>
              <p class="f-text">
                Keep every conversation
                <strong>attached to the report</strong>—no more hunting through
                emails or group chats.
              </p>
              <div class="f-chips">
                <span>Mentions</span><span>Attachments</span>
              </div>
            </div>
          </div>

          <!-- Live updates -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-bell"></i></div>
            <div class="f-body">
              <h3 class="f-title">Live status updates</h3>
              <p class="f-text">
                Everyone sees <strong>real-time progress</strong> from report to
                resolution with clear milestones.
              </p>
              <div class="f-chips">
                <span>New</span><span>In Progress</span><span>Resolved</span>
              </div>
            </div>
          </div>

          <!-- Subscribe + email notifications -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-envelope"></i></div>
            <div class="f-body">
              <h3 class="f-title">Subscribe & get notified</h3>
              <p class="f-text">
                <strong>Follow</strong> an issue and receive
                <strong>email updates</strong> whenever there’s movement.
              </p>
              <div class="f-chips">
                <span>Subscriptions</span><span>Email alerts</span>
              </div>
            </div>
          </div>

          <!-- Leaders: add staff & assign -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-briefcase"></i></div>
            <div class="f-body">
              <h3 class="f-title">Team assignment</h3>
              <p class="f-text">
                Municipal leaders can <strong>add staff</strong>, assign the
                right people, and track <strong>workload</strong> across wards.
              </p>
              <div class="f-chips">
                <span>Staffing</span><span>Ownership</span>
              </div>
            </div>
          </div>

          <!-- Staff scheduling -->
          <div class="feature-card">
            <div class="f-icon"><i class="pi pi-calendar"></i></div>
            <div class="f-body">
              <h3 class="f-title">Scheduled maintenance</h3>
              <p class="f-text">
                Staff can <strong>schedule jobs</strong>, plan routes, and keep
                resolutions on time.
              </p>
              <div class="f-chips">
                <span>Calendar</span><span>Routing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ROLES (TABS) ===== -->

    <!-- ===== INTEGRATIONS =====
    <section class="integrations">
      <div class="container mx-auto px-4 integrations-inner">
        <h3>Works with your tools</h3>
        <div class="integrations-logos">
          <img src="/integrations/gmail.svg" alt="Email" />
          <img src="/integrations/google-maps.svg" alt="Maps" />
        </div>
        <p class="integrations-note">
          Email alerts · Map pinning · SSO (coming soon) · CSV export
        </p>
      </div>
    </section> -->

    <!-- ===== TRUST & RELIABILITY ===== -->

    <!-- ===== CTA ===== -->
    <section class="cta">
      <div class="container mx-auto px-4">
        <div class="cta-box">
          <h2>Bring your ward together</h2>
          <p>Start resolving issues faster with a single, shared workspace.</p>
          <div class="cta-actions">
            <Button
              label="Create your free account"
              class="p-button-rounded p-button-lg primary-cta"
              @click="router.push({ name: 'register' })"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import Button from "primevue/button";
import Rating from "primevue/rating";

const router = useRouter();
const rating = ref(5);

/** 👉 Rotator words */
const words = [
  "roads",
  "water leaks",
  "power outages",
  "streetlights",
  "parks",
  "potholes",
];
const firstWord = computed(() => words[0]);
const longestWord = computed(() => {
  let longest = words[0];
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > longest.length) longest = words[i];
  }
  return longest;
});

const currentWord = ref(firstWord.value);
const isAnimating = ref(false);
const measured = ref(false);

/** Measurers (OUTSIDE the width-controlled wrapper) */
const wrapRef = ref<HTMLElement | null>(null);
const measureFirstRef = ref<HTMLElement | null>(null);
const measureLongestRef = ref<HTMLElement | null>(null);
const firstWidthPx = ref("auto");
const longestWidthPx = ref("auto");

function measureWidths() {
  // Defer 1 frame so fonts/layout are ready
  requestAnimationFrame(function () {
    if (!measureFirstRef.value || !measureLongestRef.value) return;
    const f = Math.ceil(measureFirstRef.value.offsetWidth + 4); // buffer
    const l = Math.ceil(measureLongestRef.value.offsetWidth + 10); // extra room
    firstWidthPx.value = f + "px";
    longestWidthPx.value = l + "px";
    measured.value = true;
  });
}

/** Cycle timings (Slack-like) */
const ENTER_MS = 220;
const HOLD_MS = 100;
const ROTATION_INTERVAL_MS = ENTER_MS + HOLD_MS; // ~320ms + next tick; fast cycle feel
const END_PAUSE_MS = 5000; // wait at snug state after cycle

let ticker: number | undefined;
let starter: number | undefined;

function startCycle() {
  isAnimating.value = true;

  let i = 1; // show second word first; first already visible
  currentWord.value = words[i];

  ticker = window.setInterval(function () {
    i++;
    if (i < words.length) {
      currentWord.value = words[i];
    } else {
      if (ticker) clearInterval(ticker);
      // let the last word sit briefly, then collapse back to snug and pause
      window.setTimeout(function () {
        currentWord.value = firstWord.value;
        isAnimating.value = false;
        starter = window.setTimeout(startCycle, END_PAUSE_MS);
      }, HOLD_MS);
    }
  }, ROTATION_INTERVAL_MS);
}

/** Roles tabs */
const role = ref<"resident" | "staff" | "leader">("resident");

onMounted(function () {
  currentWord.value = firstWord.value;
  isAnimating.value = false;

  measureWidths();
  window.addEventListener("resize", measureWidths);

  starter = window.setTimeout(startCycle, 900);
});

onBeforeUnmount(function () {
  if (ticker) clearInterval(ticker);
  if (starter) clearTimeout(starter);
  window.removeEventListener("resize", measureWidths);
});

function scrollToHow() {
  const el = document.getElementById("how");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<style scoped>
/* Page canvas */
.landing-page,
section {
  background: #fff;
}
.container {
  max-width: 1200px;
}

/* ===== HERO ===== */
.hero {
  position: relative;
  padding: 5.5rem 0 4rem;
  overflow: hidden;
}
.hero-copy {
  position: relative;
  z-index: 2;
  text-align: center;
}

.eyebrow {
  display: inline-block;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary-color), #000 90% / 6%);
  border: 1px solid color-mix(in oklab, var(--primary-color), #000 80% / 18%);
  color: #111827;
  margin-bottom: 0.75rem;
}

.display {
  font-size: clamp(2.8rem, 3.5vw + 1.6rem, 5rem);
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #0b0f16;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 0.3em;
  white-space: nowrap;
}

/* Rotator slot (the “gap”) */
.accent-wrap {
  position: relative;
  display: inline-block;
  height: 1.1em; /* fixed line-box height (no vertical jitter) */
  overflow: hidden;
  white-space: nowrap;
  transition: width 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Fallback word (shown only before measurement completes) */
.accent-fallback {
  display: inline-block;
  font-weight: 900;
  letter-spacing: -0.01em;
  background: linear-gradient(
    90deg,
    var(--primary-color),
    #16a085,
    var(--primary-color)
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* Hidden measurers live OUTSIDE the width-controlled wrapper */
.measure-lab {
  position: absolute;
  left: -9999px;
  top: auto;
  width: auto;
  height: 0;
  overflow: hidden;
}
.accent-measure {
  display: inline-block;
  white-space: nowrap;
  font-weight: 900;
}

/* Animated word (absolute so it never affects layout width) */
.accent-rotating {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  display: inline-block;
  white-space: nowrap;
  font-weight: 900;
  letter-spacing: -0.01em;
  background: linear-gradient(
    90deg,
    var(--primary-color),
    #16a085,
    var(--primary-color)
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: gradient-pan 10s linear infinite;
}

/* Slack-like vertical slide; overlap enter/leave (no gaps/drift) */
.slack-slide-enter-active,
.slack-slide-leave-active {
  transition:
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 220ms ease;
  will-change: transform, opacity;
}
.slack-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slack-slide-enter-to {
  transform: translateY(0%);
  opacity: 1;
}
.slack-slide-leave-from {
  transform: translateY(0%);
  opacity: 1;
}
.slack-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Gradient shimmer */
@keyframes gradient-pan {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* supporting styles */
.lead {
  margin-top: 1rem;
  font-size: 1.2rem;
  color: #1f2937;
  max-width: 58ch;
  margin-left: auto;
  margin-right: auto;
}
.cta-row,
.meta-row {
  justify-content: center;
}
.cta-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
.primary-cta {
  box-shadow: 0 12px 30px -12px
    color-mix(in oklab, var(--primary-color), #000 15%);
}
.primary-cta:hover {
  transform: translateY(-1px);
}
.meta-row {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.rating {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.rating-text {
  color: #4b5563;
}
.avatars {
  display: flex;
  gap: 0.35rem;
}
.avatars .dot {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
  background: color-mix(in oklab, var(--primary-color), #fff 85%);
  border: 1px solid color-mix(in oklab, var(--primary-color), #000 85% / 18%);
  color: #0b0f16;
}
.avatars .more {
  background: #fff;
  border-style: dashed;
}

/* Background blobs */
.hero-art {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.blob {
  position: absolute;
  filter: blur(40px);
  opacity: 0.55;
  background: var(--primary-color);
}
.blob-a {
  width: 420px;
  height: 420px;
  border-radius: 52% 48% 40% 60%/60% 40% 60% 40%;
  left: 12%;
  top: 10%;
}
.blob-b {
  width: 320px;
  height: 320px;
  border-radius: 40% 60% 55% 45%/45% 55% 45% 55%;
  right: 12%;
  bottom: 12%;
  opacity: 0.35;
}

/* ===== TRUSTED BY ===== */
.trusted {
  padding: 1.75rem 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  background: #fff;
}
.trusted-inner {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
}
.trusted-label {
  color: #6b7280;
  font-weight: 600;
  font-size: 0.95rem;
}
.trusted-logos {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}
.trusted-logos img {
  height: 28px;
  opacity: 0.8;
  filter: grayscale(100%);
  transition: opacity 0.2s;
}
.trusted-logos img:hover {
  opacity: 1;
  filter: none;
}

/* ===== HOW (timeline) ===== */
.how {
  padding: 2.75rem 0;
}
.timeline {
  display: grid;
  gap: 2rem;
}
@media (min-width: 900px) {
  .timeline {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: start;
  }
}
.t-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  align-items: start;
}
@media (min-width: 900px) {
  .t-item {
    grid-template-columns: 1fr;
  }
}
.t-dot {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fff, #fafafb);
  border: 1px solid #e7e7e9;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.t-card {
  border: 1px solid #e7e7e9;
  background: #fff;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}
.t-card h4 {
  margin: 0 0 0.35rem;
}
.t-card p {
  margin: 0;
  color: #4b5563;
}
.t-connector {
  display: none;
}
@media (min-width: 900px) {
  .t-connector {
    display: block;
    width: 100%;
    height: 2px;
    align-self: center;
    background: linear-gradient(90deg, #e7e7e9, #f4f4f6);
    border-radius: 999px;
  }
}

/* ===== FEATURES ===== */
.features {
  padding: 3rem 0 3.5rem;
  position: relative;
}
.features-head {
  text-align: center;
  max-width: 820px;
  margin: 0 auto 1.25rem;
}
.features-head h2 {
  margin: 0 0 0.4rem;
  font-size: clamp(1.9rem, 1.4vw + 1.2rem, 2.6rem);
  letter-spacing: -0.015em;
}
.features-sub {
  margin: 0;
  color: #4b5563;
  font-size: 1.05rem;
}
.features-grid {
  margin-top: 1.25rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1100px) {
  .features-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.feature-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--surface-200, #e7e7e9);
  background: linear-gradient(180deg, #fff, #fafafb);
  border-radius: 16px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.03),
    0 10px 30px -20px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}
.feature-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--primary-color), #000 80% / 18%);
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.03),
    0 20px 40px -24px color-mix(in oklab, var(--primary-color), #000 18%);
}
.f-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: radial-gradient(
    120% 120% at 30% 10%,
    color-mix(in srgb, var(--primary-color) 16%, transparent),
    transparent
  );
  border: 1px solid var(--surface-200, #e7e7e9);
}
.f-icon i {
  font-size: 1.15rem;
  color: var(--primary-color);
}
.f-title {
  margin: 0 0 0.2rem;
  font-size: 1.12rem;
  line-height: 1.25;
}
.f-text {
  margin: 0;
  color: #4b5563;
}
.f-chips {
  margin-top: 0.55rem;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.f-chips span {
  font-size: 0.78rem;
  padding: 0.24rem 0.5rem;
  border-radius: 999px;
  background: #f5f5f7;
  border: 1px solid #ebebef;
  color: #374151;
}

/* ===== ROLES ===== */
.roles {
  padding: 2.75rem 0;
}
.roles-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}
.roles-tabs button {
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  transition: all 0.15s ease;
}
.roles-tabs button.active {
  border-color: color-mix(in oklab, var(--primary-color), #000 70% / 18%);
  color: #111827;
}
.roles-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
@media (max-width: 900px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
}
.role-card {
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #fff, #fafafb);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.12);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
}
.role-card i {
  font-size: 1.1rem;
  color: var(--primary-color);
  background: #f5f7ff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
}
.role-card h4 {
  margin: 0;
}
.role-card p {
  margin: 0.25rem 0 0;
  color: #4b5563;
}

/* ===== INTEGRATIONS ===== */
.integrations {
  padding: 2.5rem 0;
  border-top: 1px solid #eee;
}
.integrations-inner {
  text-align: center;
}
.integrations h3 {
  margin: 0 0 0.6rem;
  font-size: 1.4rem;
}
.integrations-logos {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}
.integrations-logos img {
  height: 28px;
  filter: grayscale(100%);
  opacity: 0.85;
}
.integrations-note {
  margin: 0.6rem 0 0;
  color: #6b7280;
}

/* ===== TRUST & RELIABILITY ===== */
.trust {
  padding: 2.75rem 0;
}
.trust-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 900px) {
  .trust-grid {
    grid-template-columns: 1fr;
  }
}
.trust-card {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 16px;
  padding: 1rem 1.1rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.12);
}
.trust-card i {
  font-size: 1.1rem;
  color: var(--primary-color);
  background: #f5f7ff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
}
.trust-card h4 {
  margin: 0;
}
.trust-card p {
  margin: 0.25rem 0 0;
  color: #4b5563;
}

/* ===== PRICING ===== */
.pricing {
  padding: 3rem 0;
  border-top: 1px solid #eee;
}
.pricing-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 900px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
.price-card {
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, #fff, #fafafb);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.12);
  text-align: center;
}
.price-card.featured {
  border-color: color-mix(in oklab, var(--primary-color), #000 70% / 18%);
}
.price-card h4 {
  margin: 0.2rem 0 0.4rem;
}
.price {
  font-size: 2rem;
  font-weight: 800;
  margin: 0.2rem 0 0.6rem;
}
.price-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  color: #4b5563;
  display: grid;
  gap: 0.25rem;
}

/* ===== CTA ===== */
.cta {
  padding: 3.5rem 0 4rem;
}
.cta-box {
  text-align: center;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 2rem 1.5rem;
  background: #fff;
  box-shadow: 0 20px 60px -24px
    color-mix(in oklab, var(--primary-color), #000 10%);
}
.cta-box h2 {
  margin: 0 0 0.4rem;
  font-size: clamp(1.8rem, 1.2vw + 1.2rem, 2.4rem);
}
.cta-box p {
  margin: 0 0 1.2rem;
  color: #4b5563;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .slack-slide-enter-active,
  .slack-slide-leave-active {
    transition: opacity 120ms linear;
  }
  .slack-slide-enter-from,
  .slack-slide-leave-to {
    transform: none;
  }
}
</style>
