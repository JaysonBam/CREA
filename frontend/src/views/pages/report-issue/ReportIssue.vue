<template>
  <div class="card">
    <Toast />
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-6 border-b pb-4">Report a New Issue</h1>

      <div class="report-layout">
        <!-- Left Panel: Form Details -->
        <div class="form-panel p-fluid">
          <!-- Panel for inputting report title, description and category -->
          <Panel header="1. Describe the Issue">
            <div class="flex flex-col gap-6">
              <div class="field">
                <label for="title" class="font-semibold block mb-2">Title</label>
                <InputText id="title" v-model="issueDetails.title" placeholder="e.g., Large Pothole on Main St" class="w-full"/>
              </div>
              <div class="field">
                <label for="description" class="font-semibold block mb-2">Description</label>
                <Textarea id="description" v-model="issueDetails.description" :autoResize="true" rows="5" placeholder="Provide as much detail as possible..." class="w-full"/>
              </div>
              <div class="field">
                <label for="category" class="font-semibold block mb-2">Category</label>
                <Select id="category" v-model="issueDetails.category" :options="categoryOptions" placeholder="Select a category" />
              </div>
            </div>
          </Panel>
        </div>

        <!-- Map and Location. User device location will be used as default
              User can drag pin or click on map to change location. -->
        <div class="map-panel">
          <Panel header="2. Pinpoint the Location">
            <div class="flex flex-col gap-4">
              <!-- Address geocoding -->
              <div class="field">
                <label for="address" class="font-semibold">Address</label>
                <div class="relative">
                  <InputText id="address" v-model="address" @input="debouncedGeocodeAddress" placeholder="Start typing an address..." />
                  <ProgressSpinner v-if="geocoding" class="absolute top-1/2 right-3 -mt-3" style="width: 25px; height: 25px" strokeWidth="6" />
                </div>
              </div>

              <!-- Leaflet Map Container -->
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
                  >
                  </l-marker>
                </l-map>
              </div>
            </div>
          </Panel>
        </div>
        <div class="map-panel">
          <!-- Attachment uploading -->
        <Panel header="3. Upload Attachments (Optional)" class="mt-6">
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

      <!-- Submission Button -->
      <div class="mt-6 text-right">
        <Button
          label="Submit Report"
          icon="pi pi-check"
          class="p-button-lg"
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
import { 
  createLocation, 
  createIssueReport,
  createFileAttachment
 } from "@/utils/backend_helper";

// --- Leaflet Imports ---
import "leaflet/dist/leaflet.css";
import { LMap, LTileLayer, LMarker } from "@vue-leaflet/vue-leaflet";

// --- State Management ---
const router = useRouter();
const toast = useToast();

const issueDetails = reactive({ title: "", description: "", category: null });
const categoryOptions = ref(['POTHOLE', 'WATER_LEAK', 'POWER_OUTAGE', 'STREETLIGHT_FAILURE', 'OTHER']);

const mapLoading = ref(true);
const geocoding = ref(false);
const submitting = ref(false);
const selectedFiles = ref([]);
const address = ref("");
const zoom = ref(15);
const mapCenter = ref([-25.7546, 28.2314]); // Default: Pretoria [lat, lng]
const selectedLocation = ref(null); // [lat, lng]

// --- Computed Properties ---
const isFormInvalid = computed(() => {
  return !issueDetails.title || !issueDetails.category || !selectedLocation.value;
});

// --- Geocoding and Map Logic ---
let geocoder;
onMounted(() => {
  // Initialize the geocoder once the Google Maps script is loaded
  geocoder = new window.google.maps.Geocoder();
  getUserLocation();
});

//  Get user's current location using Geolocation API
const getUserLocation = () => {
  mapLoading.value = true;
  navigator.geolocation?.getCurrentPosition(
    (position) => {
      const userPos = [position.coords.latitude, position.coords.longitude];
      updateLocation(userPos);
      mapLoading.value = false;
    },
    () => {
      toast.add({ severity: 'warn', summary: 'Location Denied', detail: 'Using default location.', life: 3000 });
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
      const location = results[0].geometry.location;
      // Convert Google's format to Leaflet's format [lat, lng]
      const pos = [location.lat(), location.lng()];
      updateLocation(pos);
    } else {
      toast.add({ severity: 'warn', summary: 'Geocode Failed', detail: 'Could not find address.', life: 3000 });
    }
  });
};

const reverseGeocode = (latLngArray) => {
  if (!geocoder) return;
  geocoding.value = true;
  // Convert Leaflet's array format to Google's object format
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
  // nextTick ensures the map has recentered before we try to geocode
  await nextTick();
  reverseGeocode(posArray);
};

//  Update location when marker is dragged
const handleMarkerDrag = (event) => {
  const latLng = event.target.getLatLng();
  const newPos = [latLng.lat, latLng.lng];
  updateLocation(newPos);
};

//  Update location when map is clicked
const handleMapClick = (event) => {
  const newPos = [event.latlng.lat, event.latlng.lng];
  updateLocation(newPos);
}

// --- File Upload Logic ---
// Handle file selection, this function is run each time the user selects a file
const onFileSelect = (event) => {
  console.log("Selected files:", event.files);
  selectedFiles.value = event.files;
};

// Handle file upload when the report is submitted
const uploadFiles = async (event, reportToken) => {
  console.log("Uploading files for report token:", reportToken);
  console.log("Files to upload:", event.files);
  if (!reportToken || !event.files.length) {
    return;
  }

  // Format files for upload
  const formData = new FormData();
  event.files.forEach(file => {
    formData.append("attachments", file);
  });
  formData.append("issue_report_token", reportToken);

  // console.log("Uploading files formData:", formData.body);

  try {
    await createFileAttachment(formData);
    toast.add({ severity: 'info', summary: 'Upload Complete', detail: `${event.files.length} file(s) uploaded.`, life: 3000 });
  } catch (uploadError) {
    toast.add({ severity: 'error', summary: 'File Upload Failed', detail: 'Could not upload attachments.', life: 3000 });
    console.error("File upload error:", uploadError);
  }
};

// --- Form Submission ---
const submitReport = async () => {
  if (isFormInvalid.value) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill all required fields and select a location.', life: 3000 });
    return;
  }
  submitting.value = true;
  try {
    // Format request payloads
    const locationPayload = {
      address: address.value,
      latitude: selectedLocation.value[0], // Use array index 0 for latitude
      longitude: selectedLocation.value[1], // Use array index 1 for longitude
    };
    // Create location first to get its ID
    const { data: newLocation } = await createLocation(locationPayload);
    // Then create the issue report with the new location ID
    const reportPayload = {
      ...issueDetails,
      location_id: newLocation.id,
      user_id: sessionStorage.getItem("id"),
    };
    const { data: newReport } = await createIssueReport(reportPayload);
    // console.log("Created report:", newReport);
    
    // Trigger the file upload process if there are files
    if (selectedFiles.value.length > 0) {
      // Create a temporary object matching the structure the uploader expects
      const uploadEvent = { files: selectedFiles.value };
      await uploadFiles(uploadEvent, newReport.token);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Issue reported successfully!', life: 3000 });
    // Redirect to user reports page
    router.push('/user-reports');
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Submission Failed', detail: e.message, life: 3000 });
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.report-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .report-layout {
    grid-template-columns: repeat(2, 1fr);
  }
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
  z-index: 1000; /* High z-index for Leaflet */
  border-radius: 6px;
  color: #6c757d;
}
</style>