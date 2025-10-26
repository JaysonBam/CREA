<template>
  <div class="card">
    <Toast />
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-6 border-b pb-4">Report a New Issue</h1>

      <div class="report-layout">
        <!-- Describe panel (left on desktop, top on mobile) -->
        <div class="describe-panel form-panel p-fluid flex flex-col gap-6">
          <Panel header="1. Describe the Issue">
            <div class="flex flex-col gap-6">
              <div class="field">
                <label for="title" class="font-semibold block mb-2">Title</label>
                <InputText
                  id="title"
                  v-model="issueDetails.title"
                  placeholder="e.g., Large Pothole on Main St"
                  class="w-full"
                />
              </div>

              <div class="field">
                <label for="description" class="font-semibold block mb-2">Description</label>
                <Textarea
                  id="description"
                  v-model="issueDetails.description"
                  :autoResize="true"
                  rows="5"
                  placeholder="Provide as much detail as possible..."
                  class="w-full"
                />
              </div>

              <div class="field">
                <label for="category" class="font-semibold block mb-2">Category</label>
                <Select
                  id="category"
                  v-model="issueDetails.category"
                  :options="categoryOptions"
                  placeholder="Select a category"
                />
              </div>
            </div>
          </Panel>
        </div>

        <!-- Map panel (right on desktop, middle on mobile) -->
        <div class="map-panel">
          <Panel header="2. Pinpoint the Location">
            <div class="flex flex-col gap-4">
              <div class="grid gap-4 md:grid-cols-2">
                <div class="field">
                  <label for="address" class="font-semibold block mb-2">Address</label>
                  <div class="relative">
                    <InputText
                      id="address"
                      v-model="address"
                      @input="debouncedGeocodeAddress"
                      placeholder="Start typing an address..."
                      class="w-full"
                    />
                    <ProgressSpinner
                      v-if="geocoding"
                      class="absolute top-1/2 right-3 -mt-3"
                      style="width: 25px; height: 25px"
                      strokeWidth="6"
                    />
                  </div>
                </div>

                <div class="field">
                  <label for="ward" class="font-semibold block mb-2">Ward</label>
                  <Select
                    id="ward"
                    class="w-full"
                    :options="wards"
                    :loading="wardsLoading"
                    :filter="true"
                    filterPlaceholder="Search by name or code"
                    :filterFields="['name', 'code']"
                    optionValue="code"
                    optionLabel="name"
                    v-model="wardCode"
                    placeholder="Select a ward"
                    :disabled="!!wardsError || wardsLoading"
                  >
                    <template #value="{ value, placeholder }">
                      <span v-if="!value">{{ placeholder }}</span>
                      <span v-else>
                        {{
                          (() => {
                            const w = wards.find((x) => x.code === value);
                            return w ? `${w.name} (${w.code})` : value;
                          })()
                        }}
                      </span>
                    </template>

                    <template #option="{ option }">
                      <div class="flex flex-col">
                        <span class="font-medium">{{ option.name }}</span>
                        <span class="text-sm text-muted-color">{{ option.code }}</span>
                      </div>
                    </template>
                  </Select>
                  <small class="text-red-500 block" v-if="wardsError">{{ wardsError }}</small>
                </div>
              </div>

              <div class="map-wrapper">
                <div v-if="mapLoading" class="map-loading-overlay">
                  <ProgressSpinner />
                  <p class="mt-4">Waiting for device location...</p>
                </div>
                <l-map
                  ref="map"
                  v-model:zoom="zoom"
                  :center="mapCenter"
                  :use-global-leaflet="false"
                  @click="handleMapClick"
                >
                  <l-tile-layer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    layer-type="base"
                    name="OpenStreetMap"
                  ></l-tile-layer>
                  <l-marker
                    v-if="selectedLocation"
                    :lat-lng="selectedLocation"
                    :draggable="true"
                    @dragend="handleMarkerDrag"
                  />
                </l-map>
              </div>
            </div>
          </Panel>
        </div>

        <!-- Upload panel (right column on desktop under describe, bottom on mobile) -->
        <div class="upload-panel form-panel p-fluid flex flex-col gap-6">
          <Panel header="3. Upload Attachments (Optional)">
            <FileUpload
              ref="fileUploader"
              name="attachments"
              :multiple="true"
              :auto="false"
              :customUpload="true"
              accept="image/*"
              :maxFileSize="5000000"
              :showUploadButton="false"
              :showCancelButton="false"
              @select="onFileSelect"
              @clear="selectedFiles = []"
            >
              <template #empty>
                <p>Drag and drop files here. Files will be uploaded when you submit the report.</p>
              </template>
            </FileUpload>
          </Panel>
        </div>
      </div>

      <!-- Submit -->
      <div class="mt-6 submit-actions text-right">
        <Button
          label="Submit Report"
          icon="pi pi-check"
          class="p-button-lg submit-button"
          :disabled="isFormInvalid"
          :loading="submitting"
          @click="submitReport"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { debounce } from "lodash-es";
import { z } from "zod";
import {
  createLocation,
  createIssueReport,
  createFileAttachment,
} from "@/utils/backend_helper";
import { getAllWards } from "@/utils/ward_helper";
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker } from "@vue-leaflet/vue-leaflet";

// --- State ---
const router = useRouter();
const toast = useToast();
const issueDetails = reactive({ title: "", description: "", category: null });
const categoryOptions = ref([
  "POTHOLE",
  "WATER_LEAK",
  "POWER_OUTAGE",
  "STREETLIGHT_FAILURE",
  "OTHER",
]);

const mapLoading = ref(true);
const geocoding = ref(false);
const submitting = ref(false);
const selectedFiles = ref([]);
const address = ref("");
const zoom = ref(15);
const mapCenter = ref([-25.7546, 28.2314]);
const selectedLocation = ref(null);

const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref("");
const wardCode = ref(null);

// --- Zod Schema ---
const safeTextRegex = /^[a-zA-Z0-9\s.,'!?()-]*$/;
const categoryEnum = z.enum([
  "POTHOLE",
  "WATER_LEAK",
  "POWER_OUTAGE",
  "STREETLIGHT_FAILURE",
  "OTHER",
]);

const issueReportSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters long.")
    .max(100, "Title cannot be longer than 100 characters.")
    .regex(safeTextRegex, "Title contains invalid characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long.")
    .max(1000, "Description cannot be longer than 1000 characters.")
    .regex(safeTextRegex, "Description contains invalid characters."),
  category: categoryEnum,
  ward_code: z
    .string()
    .min(1, "Ward is required.")
    .max(32, "Ward code is too long."),
  address: z
    .string()
    .min(3, "Address is required.")
    .max(255, "Address cannot exceed 255 characters."),
  location: z.tuple([
    z.number().refine((v) => v >= -90 && v <= 90, "Invalid latitude"),
    z.number().refine((v) => v >= -180 && v <= 180, "Invalid longitude"),
  ]),
});

// --- Computed ---
const isFormInvalid = computed(() => {
  return (
    !issueDetails.title ||
    !issueDetails.category ||
    !selectedLocation.value ||
    !wardCode.value
  );
});

// --- Map & Geocode ---
let geocoder;
onMounted(async () => {
  geocoder = new window.google.maps.Geocoder();
  getUserLocation();

  try {
    wardsLoading.value = true;
    const res = await getAllWards();
    wards.value = Array.isArray(res?.data?.data) ? res.data.data : [];
  } catch (e) {
    wardsError.value =
      e?.response?.data?.message || e?.message || "Failed to load wards";
  } finally {
    wardsLoading.value = false;
  }
});

const getUserLocation = () => {
  mapLoading.value = true;
  navigator.geolocation?.getCurrentPosition(
    (position) => {
      const userPos = [position.coords.latitude, position.coords.longitude];
      updateLocation(userPos);
      mapLoading.value = false;
    },
    () => {
      toast.add({
        severity: "warn",
        summary: "Location Denied",
        detail: "Using default location.",
        life: 3000,
      });
      mapLoading.value = false;
    }
  );
};

const geocodeAddress = () => {
  if (!address.value || !geocoder) return;
  geocoding.value = true;
  geocoder.geocode({ address: address.value }, (results, status) => {
    geocoding.value = false;
    if (status === "OK" && results[0]) {
      const pos = [
        results[0].geometry.location.lat(),
        results[0].geometry.location.lng(),
      ];
      updateLocation(pos);
    } else {
      toast.add({
        severity: "warn",
        summary: "Geocode Failed",
        detail: "Could not find address.",
        life: 3000,
      });
    }
  });
};

const reverseGeocode = (latLngArray) => {
  if (!geocoder) return;
  geocoding.value = true;
  const googleLatLng = { lat: latLngArray[0], lng: latLngArray[1] };
  geocoder.geocode({ location: googleLatLng }, (results, status) => {
    geocoding.value = false;
    if (status === "OK" && results[0]) {
      address.value = results[0].formatted_address;
    }
  });
};

const debouncedGeocodeAddress = debounce(geocodeAddress, 700);

const updateLocation = async (posArray) => {
  selectedLocation.value = posArray;
  mapCenter.value = posArray;
  await nextTick();
  reverseGeocode(posArray);
};

const handleMarkerDrag = (event) => {
  const latLng = event.target.getLatLng();
  updateLocation([latLng.lat, latLng.lng]);
};

const handleMapClick = (event) => {
  updateLocation([event.latlng.lat, event.latlng.lng]);
};

// --- File Upload ---
const onFileSelect = (event) => {
  selectedFiles.value = event.files;
};

const uploadFiles = async (event, reportToken) => {
  if (!reportToken || !event.files.length) return;

  const formData = new FormData();
  event.files.forEach((file) => {
    formData.append("attachments", file);
  });
  formData.append("issue_report_token", reportToken);

  try {
    await createFileAttachment(formData);
    toast.add({
      severity: "info",
      summary: "Upload Complete",
      detail: `${event.files.length} file(s) uploaded.`,
      life: 3000,
    });
  } catch (uploadError) {
    toast.add({
      severity: "error",
      summary: "File Upload Failed",
      detail: "Could not upload attachments.",
      life: 3000,
    });
  }
};

// --- Submit ---
const submitReport = async () => {
  const candidate = {
    title: issueDetails.title,
    description: issueDetails.description,
    category: issueDetails.category,
    ward_code: wardCode.value,
    address: address.value,
    location: selectedLocation.value,
  };

  const result = issueReportSchema.safeParse(candidate);
  if (!result.success) {
    const firstError = result.error.issues[0];
    toast.add({
      severity: "warn",
      summary: "Validation Error",
      detail: firstError?.message || "Please fix the invalid fields.",
      life: 3000,
    });
    return;
  }

  submitting.value = true;
  try {
    const locationPayload = {
      address: address.value,
      latitude: selectedLocation.value[0],
      longitude: selectedLocation.value[1],
    };
    const { data: newLocation } = await createLocation(locationPayload);

    const reportPayload = {
      ...issueDetails,
      location_id: newLocation.id,
      user_id: sessionStorage.getItem("id"),
      ward_code: wardCode.value,
    };
    const { data: newReport } = await createIssueReport(reportPayload);

    if (selectedFiles.value.length > 0) {
      const uploadEvent = { files: selectedFiles.value };
      await uploadFiles(uploadEvent, newReport.token);
    }

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Issue reported successfully!",
      life: 3000,
    });
    router.push("/user-reports");
  } catch (e) {
    toast.add({
      severity: "error",
      summary: "Submission Failed",
      detail: e.message,
      life: 3000,
    });
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.report-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "describe map"
    "upload map";
  gap: 1.5rem;
}

.describe-panel {
  grid-area: describe;
}
.map-panel {
  grid-area: map;
}
.upload-panel {
  grid-area: upload;
}

.map-wrapper {
  position: relative;
  height: 400px;
  width: 100%;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 6px;
  color: #6c757d;
}

@media (max-width: 767px) {
  /* Stack describe, map, upload vertically on small screens */
  .report-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "describe"
      "map"
      "upload";
    gap: 0.5rem; /* tighter stacking */
  }

  /* Make map shorter on mobile to avoid excessive scroll */
  .map-wrapper {
    height: 220px;
  }

  /* Make submit button full-width and easier to tap on mobile */
  .submit-actions {
    text-align: center; /* center the button */
  }
  .submit-actions .submit-button.p-button {
    width: 100%;
    max-width: 420px;
  }

  /* Slightly increase spacing inside panels for touch targets */
  .form-panel .field {
    margin-bottom: 0.5rem;
  }
}

/* Extra compact adjustments for mobile form (reduce paddings, tighten inputs) */
@media (max-width: 767px) {
  /* Reduce panel inner padding and margins to fit more content */
  .form-panel .p-panel .p-panel-content,
  .map-panel .p-panel .p-panel-content {
    padding: 0.5rem !important;
  }

  /* Reduce space between panels */
  .p-panel {
    margin-bottom: 0.5rem;
  }

  /* Smaller labels and reduced vertical gaps */
  .form-panel .field label {
    margin-bottom: 0.25rem;
    font-size: 0.95rem;
  }

  /* Compact input/textarea/dropdown styling */
  .form-panel .field .p-inputtext,
  .form-panel .field .p-inputtextarea,
  .form-panel .field .p-dropdown,
  .form-panel .field .p-autocomplete {
    padding: 0.45rem 0.6rem !important;
    font-size: 0.95rem !important;
  }

  /* File upload: smaller button and tighter panel */
  .p-fileupload {
    padding: 0.4rem !important;
  }
  .p-fileupload .p-fileupload-buttonbar .p-button,
  .p-fileupload .p-fileupload-choose {
    padding: 0.35rem 0.6rem !important;
    font-size: 0.95rem !important;
  }

  /* Grid fields: reduce gap inside the address/ward row */
  .grid.gap-4 {
    gap: 0.5rem;
  }

  /* Tighter submit button */
  .submit-actions .submit-button.p-button {
    padding: 0.6rem 0.75rem;
    font-size: 1rem;
  }

  /* Smaller page title for mobile */
  .p-4 > h1 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
}

/* Further tighten nested card/panel paddings on mobile to avoid "card-on-card" whitespace */
@media (max-width: 767px) {
  /* Reduce outer card padding */
  .card {
    padding: 0.5rem !important;
    border-radius: 8px;
  }

  /* Reduce the padded container inside the card */
  .card > .p-4 {
    padding: 0.5rem !important;
  }

  /* Panels (PrimeVue) — smaller header and content padding */
  .p-panel {
    margin-bottom: 0.45rem !important;
    border-radius: 6px;
    overflow: hidden;
  }
  .p-panel .p-panel-header {
    padding: 0.45rem 0.6rem !important;
    font-size: 1rem;
  }
  .p-panel .p-panel-content {
    padding: 0.45rem 0.6rem !important;
  }

  /* Make the upload placeholder tighter */
  .p-fileupload .p-fileupload-choose {
    padding: 0.35rem 0.55rem !important;
  }
  .p-fileupload .p-fileupload-content {
    padding: 0.45rem !important;
  }

  /* Reduce card-internal vertical spacing */
  .form-panel .flex.flex-col,
  .map-panel .flex.flex-col {
    gap: 0.5rem !important;
  }

  /* Tighter borders and spacing for map wrapper */
  .map-wrapper {
    border-radius: 6px;
  }
}

/* Extra compact rules for very small screens (phones) */
@media (max-width: 480px) {
  /* Make map shorter to fit more above the fold */
  .map-wrapper { height: 180px; }

  /* Reduce panel padding further */
  .p-panel .p-panel-header { padding: 0.35rem 0.45rem !important; font-size: 0.95rem; }
  .p-panel .p-panel-content { padding: 0.35rem 0.45rem !important; }

  /* Image previews inside fileupload or panels should be compact */
  .p-fileupload .p-fileupload-files img,
  .p-fileupload .p-fileupload-content img,
  .form-panel img,
  .map-panel img,
  .upload-panel img,
  .p-panel img {
    max-height: 80px !important;
    width: auto !important;
    border-radius: 6px !important;
    object-fit: cover !important;
  }

  /* If fileupload shows files as grid, make items smaller */
  .p-fileupload .p-fileupload-files {
    gap: 0.35rem !important;
  }
  .p-fileupload .p-fileupload-files .p-fileupload-row {
    padding: 0.25rem !important;
    font-size: 0.85rem !important;
  }

  /* Reduce title size and header spacing to save vertical space */
  .p-4 > h1 { font-size: 1rem; margin-bottom: 0.35rem; }

  /* Make panels arrange more compactly: reduce gaps inside report layout */
  .report-layout { gap: 0.4rem; }

  /* Make input paddings slightly smaller to fit more fields */
  .form-panel .field .p-inputtext,
  .form-panel .field .p-inputtextarea,
  .form-panel .field .p-dropdown,
  .form-panel .field .p-autocomplete {
    padding: 0.35rem 0.5rem !important;
    font-size: 0.9rem !important;
  }
}
</style>
