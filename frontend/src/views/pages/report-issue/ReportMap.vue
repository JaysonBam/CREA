<template>
  <div class="card">
    <Toast />
    <h5 class="m-0 text-xl font-semibold mb-4">Manage Issue Reports</h5>

    <div class="grid-container">
      <!-- Map Window Panel -->
      <div class="map-panel">
        <Panel header="Issue Map" toggleable>
          <div style="height: 600px; width: 100%">
            <l-map
              ref="map"
              v-model:zoom="zoom"
              :center="center"
              :use-global-leaflet="false"
            >
              <l-tile-layer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                layer-type="base"
                name="OpenStreetMap"
              ></l-tile-layer>

              <!-- Loop through reports with locations and add markers -->
              <l-marker
                v-for="report in reportsWithLocation"
                :key="report.id"
                :lat-lng="[report.location.latitude, report.location.longitude]"
              >
                <l-popup>
                  <div class="map-popup">
                    <div class="font-bold">{{ report.title }}</div>
                    <div>
                      <Tag :value="report.category" class="mr-2" />
                      <Tag :value="report.status" :severity="getStatusSeverity(report.status)" />
                    </div>
                  </div>
                </l-popup>
              </l-marker>
            </l-map>
          </div>
        </Panel>
      </div>

      <!-- Data Table Panel -->
      <div class="table-panel">
        <DataTable
          :value="rows"
          dataKey="id"
          :loading="loading"
          :paginator="true"
          :rows="8"
          :rowsPerPageOptions="[5, 8, 25]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} reports"
          responsiveLayout="scroll"
          stripedRows
        >
          <template #empty>
            <div class="py-4 text-center">No records found.</div>
          </template>
          <template #loading>
            <div class="py-4 text-center">Loading…</div>
          </template>

          <Column field="title" header="Title" :sortable="true"></Column>
          <Column field="category" header="Category" :sortable="true"></Column>
          <Column field="user.email" header="Reported By">
             <template #body="{ data }">
              {{ data.user?.email || 'N/A' }}
            </template>
          </Column>
          <Column field="createdAt" header="Date" :sortable="true">
            <template #body="{ data }">
              {{ new Date(data.createdAt).toLocaleString() }}
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Dialogs remain the same but are not shown in this snippet for brevity -->
    <!-- Place your Edit/Delete Dialogs here if needed -->

  </div>
</template>

<script setup>
// --- Core Vue and PrimeVue Imports ---
import { ref, reactive, onMounted, computed } from "vue";
import { useToast } from "primevue/usetoast";
import { listIssueReports } from "@/utils/backend_helper"; // Ensure this path is correct

// --- Leaflet Map Imports ---
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker, LPopup } from "@vue-leaflet/vue-leaflet";

// --- State Management ---
const rows = ref([]);
const loading = ref(false);
const toast = useToast();

// --- Map Specific State ---
const zoom = ref(13);
const center = ref([-25.7546, 28.2314]); // Default center: Pretoria, SA

// --- Data Fetching and Processing ---
const load = async () => {
  loading.value = true;
  try {
    const { data } = await listIssueReports();
    rows.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({ severity: "error", summary: "Load failed", detail: e.message, life: 3500 });
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

// Computed property to filter for reports that have location data
const reportsWithLocation = computed(() => {
  return rows.value.filter(
    (report) => report.location && report.location.latitude && report.location.longitude
  );
});

// Helper function to get severity for status tags
const getStatusSeverity = (status) => {
  switch (status) {
    case 'RESOLVED': return 'success';
    case 'IN_PROGRESS': return 'warning';
    case 'ACKNOWLEDGED': return 'info';
    case 'NEW': return 'primary';
    default: return 'secondary';
  }
};

// --- Lifecycle Hook ---
onMounted(() => {
  // Try to get user's location from session storage
  const lat = sessionStorage.getItem("lat");
  const long = sessionStorage.getItem("long");

  if (lat && long) {
    center.value = [parseFloat(lat), parseFloat(long)];
  } else {
    console.warn("User location not found in sessionStorage. Using default location.");
  }

  // Load the issue report data
  load();
});
</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: 1fr; /* Default to single column for mobile */
  gap: 1.5rem;
}

/* For screens wider than 1024px, use a two-column layout */
@media (min-width: 1024px) {
  .grid-container {
    grid-template-columns: 1fr 1fr;
  }
}

.map-popup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 14px;
}

/* Ensure PrimeVue and Leaflet styles don't conflict */
:deep(.leaflet-pane) {
  z-index: 1;
}
:deep(.leaflet-top, .leaflet-bottom) {
  z-index: 2;
}
</style>