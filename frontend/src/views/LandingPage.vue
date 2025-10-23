<template>
  <div class="landing">
    <AppHeader />

    <!-- Hero -->
    <section class="hero surface-section">
      <div class="container mx-auto px-4 py-6 md:py-8">
        <div class="hero-narrow">
          <h1 class="display">
            Building Better
            <span class="rotator">
              <Transition name="slide-fade" mode="out-in">
                <span :key="currentWord" class="accent-rotating">{{ currentWord }}</span>
              </Transition>
            </span>,
            <span class="together">Together.</span>
          </h1>

          <p class="lead text-700">
            CREA.com is the all-in-one platform for residents and city managers to report, track,
            and resolve community maintenance issues seamlessly.
          </p>

          <div class="mt-5 hero-cta">
            <Button
              label="Sign up"
              class="p-button-rounded p-button-lg"
              @click="router.push({ name: 'register' })"
            />
            <Button
              label="Learn more"
              class="p-button-outlined p-button-lg"
              @click="scrollToHow"
            />
          </div>

          <div class="mt-4 flex align-items-center gap-3">
            <Rating v-model="rating" :cancel="false" readonly />
            <span class="text-700">4.8/5 from municipalities & residents</span>
          </div>

          <!-- Stats strip -->
          <div class="stats mt-5 grid grid-nogutter">
            <div class="stat">
              <span class="stat-k">50k+</span>
              <span class="stat-l">Issues resolved</span>
            </div>
            <div class="stat">
              <span class="stat-k">120+</span>
              <span class="stat-l">Wards onboarded</span>
            </div>
            <div class="stat">
              <span class="stat-k">35%</span>
              <span class="stat-l">Faster resolution</span>
            </div>
          </div>
        </div>
      </div>
      <div class="wave" aria-hidden="true"></div>
    </section>

    <!-- Features -->
    <section id="features" class="section features">
      <div class="container mx-auto px-4">
        <div class="features-grid">
          <div class="feature-card">
            <div class="f-icon">
              <i class="pi pi-send"></i>
            </div>
            <div class="f-body">
              <h3 class="f-title">Report Issues</h3>
              <p class="f-text">
                Residents log potholes, lamp faults, leaks and more with precise locations and photos.
              </p>
              <div class="f-chips">
                <span>Potholes</span><span>Street Lamps</span><span>Water</span>
              </div>
            </div>
          </div>

          <div class="feature-card">
            <div class="f-icon">
              <i class="pi pi-briefcase"></i>
            </div>
            <div class="f-body">
              <h3 class="f-title">Assign &amp; Schedule</h3>
              <p class="f-text">
                Route work to staff, set due dates and track SLA compliance from a central board.
              </p>
              <div class="f-chips">
                <span>Work Orders</span><span>SLA</span><span>Shift Load</span>
              </div>
            </div>
          </div>

          <div class="feature-card">
            <div class="f-icon">
              <i class="pi pi-chart-line"></i>
            </div>
            <div class="f-body">
              <h3 class="f-title">Maps &amp; Analytics</h3>
              <p class="f-text">
                See hotspots on a map and measure resolution times to drive continuous improvement.
              </p>
              <div class="f-chips">
                <span>Hotspots</span><span>KPIs</span><span>Dashboards</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works (Timeline) -->
    <section id="how" class="section how">
      <div class="container mx-auto px-4">
        <div class="timeline">
          <!-- Step 1 -->
          <div class="t-item">
            <div class="t-dot"><span>1</span></div>
            <div class="t-card">
              <h4>Submit</h4>
              <p>Residents submit an issue in seconds — add a pin, description and photos.</p>

            </div>
          </div>

          <div class="t-connector" aria-hidden="true"></div>

          <!-- Step 2 -->
          <div class="t-item">
            <div class="t-dot"><span>2</span></div>
            <div class="t-card">
              <h4>Assign</h4>
              <p>Supervisors triage, assign staff, and schedule with one click.</p>
              
            </div>
          </div>

          <div class="t-connector" aria-hidden="true"></div>

          <!-- Step 3 -->
          <div class="t-item">
            <div class="t-dot"><span>3</span></div>
            <div class="t-card">
              <h4>Resolve</h4>
              <p>Field teams update progress on-site via mobile — residents get notified.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section id="testimonials" class="section testimonials">
      <div class="container mx-auto px-4 testimonials-grid">
        <div class="tst">
          <div class="tst-head">
            <div class="tst-avatar">LM</div>
            <div>
              <div class="tst-name">L. Mokoena</div>
              <div class="tst-role">Ward 17 Resident</div>
            </div>
          </div>
          <div class="tst-stars">
            <Rating v-model="five" :cancel="false" readonly />
          </div>
          <blockquote>“Our potholes were fixed within a week. So simple to use.”</blockquote>
        </div>

        <div class="tst">
          <div class="tst-head">
            <div class="tst-avatar">TN</div>
            <div>
              <div class="tst-name">T. Naidoo</div>
              <div class="tst-role">Maintenance Lead</div>
            </div>
          </div>
          <div class="tst-stars">
            <Rating v-model="five" :cancel="false" readonly />
          </div>
          <blockquote>“Scheduling and staff routing are game-changers for our team.”</blockquote>
        </div>

        <div class="tst">
          <div class="tst-head">
            <div class="tst-avatar">AK</div>
            <div>
              <div class="tst-name">A. Khumalo</div>
              <div class="tst-role">Operations</div>
            </div>
          </div>
          <div class="tst-stars">
            <Rating v-model="five" :cancel="false" readonly />
          </div>
          <blockquote>“Visibility over hotspots helped us allocate budget better.”</blockquote>
        </div>
      </div>
    </section>

  

    <!-- Footer -->
 
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import Button from 'primevue/button'
import Rating from 'primevue/rating'

const router = useRouter()
const rating = ref(5)
const five = ref(5)
const year = new Date().getFullYear()

// Simple word rotator for the hero (you can change the words/speed)
const rotatingWords = ['Communities', 'Wards', 'Streets', 'Parks', 'Public Spaces']
const currentIndex = ref(0)
const currentWord = ref(rotatingWords[0])
let ticker: number | undefined

onMounted(() => {
  ticker = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % rotatingWords.length
    currentWord.value = rotatingWords[currentIndex.value]
  }, 2200)
})
onBeforeUnmount(() => { if (ticker) clearInterval(ticker) })

function scrollToHow() {
  const el = document.getElementById('how')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
/* Layout */
.landing { padding-top: 4.5rem; } /* offset sticky header */
.container { max-width: 1160px; }
.section { padding: 3.25rem 0; }

/* Hero */
.hero {
  position: relative;
  padding: 3.5rem 0 2.5rem;
  background:
    radial-gradient(90% 90% at 20% 10%, var(--surface-100), transparent),
    linear-gradient(180deg, var(--surface-0), var(--surface-50));
}
.hero-narrow { max-width: 820px; margin: 0 auto; }
.display {
  font-size: clamp(2.2rem, 2.4vw + 1rem, 3.25rem);
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.lead { font-size: 1.125rem; max-width: 65ch; }

/* Rotating word (hero) */
.accent-rotating {
  background: linear-gradient(90deg, var(--primary-color), #16a085);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  position: relative;
  white-space: nowrap;
}
.accent-rotating::after {
  content: '';
  position: absolute; left: 0; right: 0; bottom: -0.15em; height: .32em;
  background: color-mix(in srgb, var(--primary-color) 24%, transparent);
  border-radius: .25em;
}
.together { color: var(--text-color); }
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity .28s ease, transform .28s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(.4em); }
.slide-fade-leave-to   { opacity: 0; transform: translateY(-.4em); }
@media (prefers-reduced-motion: reduce) {
  .slide-fade-enter-active, .slide-fade-leave-active { transition: none; }
}

/* Stats strip */
.stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .75rem; }
.stat {
  background: var(--surface-100);
  border: 1px solid var(--surface-200);
  padding: .9rem 1rem;
  border-radius: .75rem;
}
.stat-k { font-weight: 700; font-size: 1.15rem; display: block; }
.stat-l { color: var(--text-color-secondary); font-size: .9rem; }

/* -------- FEATURES (soft cards) -------- */
.features-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(1, minmax(0,1fr));
}
@media (min-width: 768px) { .features-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }

.feature-card {
  display: grid; grid-template-columns: auto 1fr; gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--surface-200);
  background: linear-gradient(180deg, var(--surface-0), var(--surface-50));
  border-radius: 16px;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
}
.f-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: grid; place-items: center;
  background: radial-gradient(110% 110% at 30% 10%, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent);
  border: 1px solid var(--surface-200);
}
.f-icon i { font-size: 1.15rem; color: var(--primary-color); }
.f-title { margin: 0 0 .25rem; font-size: 1.15rem; line-height: 1.25; }
.f-text { margin: 0; color: var(--text-color-secondary); }
.f-chips { margin-top: .6rem; display: flex; gap: .35rem; flex-wrap: wrap; }
.f-chips span {
  font-size: .78rem; padding: .25rem .5rem; border-radius: 999px;
  background: var(--surface-100); border: 1px solid var(--surface-200);
}

/* -------- TIMELINE -------- */
.how { padding-top: 2.75rem; padding-bottom: 2.75rem; }
.timeline { display: grid; gap: 2rem; }
@media (min-width: 900px) {
  .timeline {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: start;
  }
}
.t-item { display: grid; grid-template-columns: auto 1fr; gap: .9rem; align-items: start; }
@media (min-width: 900px) { .t-item { grid-template-columns: 1fr; } }

.t-dot {
  width: 44px; height: 44px; border-radius: 999px;
  background: linear-gradient(180deg, var(--surface-0), var(--surface-50));
  border: 1px solid var(--surface-200);
  display: grid; place-items: center;
  font-weight: 700; color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
}
.t-card {
  border: 1px solid var(--surface-200);
  background: var(--surface-card);
  border-radius: 14px;
  padding: .9rem 1rem;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
}
.t-card h4 { margin: 0 0 .35rem; }
.t-card p  { margin: 0; color: var(--text-color-secondary); }
.t-meta { margin-top: .5rem; font-size: .85rem; color: var(--text-color-secondary); display: inline-flex; align-items: center; gap: .35rem; }

.t-connector {
  display: none;
}
@media (min-width: 900px) {
  .t-connector {
    display: block; width: 100%; height: 2px; align-self: center;
    background: linear-gradient(90deg, var(--surface-200), var(--surface-100));
    border-radius: 999px;
  }
}

/* -------- TESTIMONIALS (lighter cards) -------- */
.testimonials-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(1, minmax(0,1fr));
}
@media (min-width: 768px) { .testimonials-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }

.tst {
  border: 1px solid var(--surface-200);
  background: var(--surface-card);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  box-shadow: 0 1px 0 rgba(0,0,0,.03);
}
.tst-head { display: flex; align-items: center; gap: .65rem; }
.tst-avatar {
  width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center;
  font-weight: 700; color: var(--primary-color);
  background: radial-gradient(120% 120% at 30% 10%, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent);
  border: 1px solid var(--surface-200);
}
.tst-name { font-weight: 600; }
.tst-role { font-size: .85rem; color: var(--text-color-secondary); }
.tst-stars { margin-top: .4rem; }
blockquote { margin: .6rem 0 0; color: var(--text-color); font-style: italic; }

/* CTA strip */
.cta {
  padding: 2.25rem 0;
  border-top: 1px solid var(--surface-200);
  border-bottom: 1px solid var(--surface-200);
  background: linear-gradient(180deg, var(--surface-0), var(--surface-50));
}
</style>
