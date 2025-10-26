<!-- ReportMap.vue -->
<template>
  <div class="card">
    <Toast />
    <h5 class="m-0 text-xl font-semibold mb-4">Map View</h5>

    <div class="map-panel">
      <div v-if="mapReady" style="height: 600px; width: 100%">
        <l-map
          ref="map"
          v-model:zoom="zoom"
          :center="center"
          :use-global-leaflet="true"
          style="height: 100%; width: 100%"
        >
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
          />
        </l-map>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useToast } from "primevue/usetoast";
import { listIssueReports } from "@/utils/backend_helper";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { LMap, LTileLayer } from "@vue-leaflet/vue-leaflet";

const rows = ref([]);
const loading = ref(false);
const toast = useToast();

const zoom = ref(14);
const center = ref([-25.7546, 28.2314]);

const map = ref(null);
const leafletMap = ref(null);
const mapReady = ref(false);

let Lready = false;
let MCready = false;
let groupLayer = null; // cluster or plain layerGroup

const load = async () => {
  loading.value = true;
  try {
    const { data } = await listIssueReports();
    rows.value = Array.isArray(data) ? data : [];
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Load failed",
      detail: e?.message || "Unknown error",
      life: 3500,
    });
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

const reportsWithLocation = computed(() =>
  rows.value.filter(
    (r) =>
      r?.location &&
      Number.isFinite(Number(r.location.latitude)) &&
      Number.isFinite(Number(r.location.longitude))
  )
);

const getIconByCategory = (category) => {
  const L = window.L;
  const files = {
    POTHOLE: "pothole.svg",
    WATER_LEAK: "leak.svg",
    POWER_OUTAGE: "power.svg",
    STREETLIGHT_FAILURE: "streetlight.svg",
    OTHER: "location.svg",
  };
  const fname = files[category] || files.OTHER;

  // Background-image + fixed box; CSS provides sizes.
  return L.divIcon({
    className: "marker-badge",
    html: `
      <div class="badge">
        <div class="badge-img" style="--icon-url: url('/icons/map/${fname}')"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -34],
  });
};

const createClusterGroup = (opts) => {
  const L = window.L;
  if (MCready && typeof L.markerClusterGroup === "function")
    return L.markerClusterGroup(opts);
  if (MCready && typeof L.MarkerClusterGroup === "function")
    return new L.MarkerClusterGroup(opts);
  // Fallback: plain layerGroup so markers still show
  return L.layerGroup();
};

const rebuildLayers = () => {
  const L = window.L;
  if (!leafletMap.value || !Lready) return;

  if (groupLayer) {
    leafletMap.value.removeLayer(groupLayer);
    groupLayer = null;
  }

  const opts = {
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 48,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="cluster-badge">${count}</div>`,
        className: "cluster-icon",
        iconSize: [50, 50],
      });
    },
  };

  groupLayer = createClusterGroup(opts);

  const items = reportsWithLocation.value;

  if (items.length === 0) {
    const fallback = L.marker(center.value, {
      icon: getIconByCategory("OTHER"),
    }).bindPopup(
      `<div class="map-popup"><strong>No geocoded reports yet</strong><br/>Fallback marker at center.</div>`
    );
    groupLayer.addLayer(fallback);
  } else {
    items.forEach((report) => {
      const lat = Number(report.location.latitude);
      const lng = Number(report.location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: getIconByCategory(report.category),
      });

      let imgHTML = "";
      const img =
        Array.isArray(report.attachments) && report.attachments.length
          ? report.attachments[0]
          : null;
      if (img?.file_link) {
        imgHTML = `<img src="${img.file_link}" alt="${img.description || "Report image"}"
                     style="width:100%;height:180px;object-fit:cover;border-radius:6px;margin-top:6px;" />`;
      }

      const popupHTML = `
        <div class="map-popup">
          <div class="font-bold" style="margin-bottom:4px;">${report.title || ""}</div>
          <div style="opacity:.85;margin-bottom:6px;">${report.category || ""} • ${report.status || ""}</div>
          ${imgHTML}
        </div>
      `;
      marker.bindPopup(popupHTML);
      groupLayer.addLayer(marker);
    });
  }

  leafletMap.value.addLayer(groupLayer);

  // Fit bounds if possible
  if (groupLayer.getLayers) {
    const count = groupLayer.getLayers().length;
    if (count > 0 && groupLayer.getBounds) {
      const bounds = groupLayer.getBounds();
      if (bounds?.isValid && bounds.isValid()) {
        leafletMap.value.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    }
  }
};

watch(reportsWithLocation, () => {
  if (leafletMap.value && Lready) nextTick(() => rebuildLayers());
});

watch(
  () => map.value && map.value.leafletObject,
  (val) => {
    if (val && !leafletMap.value) {
      leafletMap.value = val;
      nextTick(() => rebuildLayers());
    }
  }
);

onMounted(async () => {
  const lat = sessionStorage.getItem("lat");
  const long = sessionStorage.getItem("long");
  if (lat && long) center.value = [parseFloat(lat), parseFloat(long)];

  await load();

  // Leaflet UMD -> window.L
  try {
    await import("leaflet/dist/leaflet.js");
    const L = window.L;
    try {
      const iconUrl = new URL(
        "leaflet/dist/images/marker-icon.png",
        import.meta.url
      ).href;
      const iconRetinaUrl = new URL(
        "leaflet/dist/images/marker-icon-2x.png",
        import.meta.url
      ).href;
      const shadowUrl = new URL(
        "leaflet/dist/images/marker-shadow.png",
        import.meta.url
      ).href;
      if (L?.Icon?.Default)
        L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
    } catch {}
    Lready = !!window.L;
  } catch (err) {
    console.error("Failed to load Leaflet UMD:", err);
    Lready = false;
  }

  // MarkerCluster UMD (optional)
  if (Lready) {
    try {
      await import("leaflet.markercluster/dist/leaflet.markercluster.js");
      const L = window.L;
      MCready =
        typeof L.markerClusterGroup === "function" ||
        typeof L.MarkerClusterGroup === "function";
    } catch (err) {
      console.warn("MarkerCluster not available; using plain markers.", err);
      MCready = false;
    }
  }

  mapReady.value = true;
  nextTick(() => rebuildLayers());
});
</script>

<!-- IMPORTANT: these styles must be GLOBAL, not scoped -->
<style>
.map-popup {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #222;
}

/* Cluster bubble */
.cluster-icon {
  background: radial-gradient(circle, #11ba82 0%, #0b7e58 80%);

  border-radius: 50%;
  border: 2px solid #fff;
  color: #fff;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
}
.cluster-badge {
  line-height: 48px;
}

/* FIXED-SIZE MARKER BADGE (global so Leaflet DOM can see it) */
.marker-badge .badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #fff;
  box-shadow:
    0 0 0 3px rgba(0, 0, 0, 0.25),
    0 4px 12px rgba(0, 0, 0, 0.45),
    0 0 10px rgba(255, 255, 255, 0.35);
  display: grid;
  place-items: center;
}

.marker-badge .badge-img {
  width: 22px;
  height: 22px;
  background-image: var(--icon-url);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

/* Keep Leaflet UI above the map */
.leaflet-pane {
  z-index: 1;
}
.leaflet-top,
.leaflet-bottom {
  z-index: 2;
}
</style>
