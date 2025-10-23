<script setup>

import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useField } from "vee-validate";
import { getAllWards } from "@/utils/ward_helper";
import { Loader } from "@googlemaps/js-api-loader";

defineEmits(["back", "register"]);

const { value: role, errorMessage: roleError } = useField("role", undefined, {
  keepValueOnUnmount: true,
});

const { value: address, errorMessage: addressError } = useField(
  "address",
  undefined,
  { keepValueOnUnmount: true }
);

// Capture Google place details
const { value: addressLat } = useField("address_lat", undefined, {
  keepValueOnUnmount: true,
});
const { value: addressLng } = useField("address_lng", undefined, {
  keepValueOnUnmount: true,
});
const { value: addressPlaceId } = useField("address_place_id", undefined, {
  keepValueOnUnmount: true,
});

const { value: wardCode, errorMessage: wardCodeError } = useField(
  "ward_code",
  undefined,
  { keepValueOnUnmount: true }
);

const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref("");

// ----- Google Places -----
const addressInputRef = ref(null); s
let autocomplete = null;
let placeChangedListener = null;
let manualInputListener = null;


async function ensurePlacesLoaded() {
  // Load base Maps at least once
  if (!window.google?.maps) {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: [], // don't rely on this to add 'places' later
    });
    await loader.load();
  }

  const placesLib = await google.maps.importLibrary("places");
  return placesLib;
}

// Initialize Places Autocomplete AFTER the input is in the DOM
async function initAutocomplete() {
  await nextTick();

  const el = addressInputRef.value;
  if (!(el instanceof HTMLInputElement)) {
    // If swapping to a wrapped input later, find the inner real input here.
    return;
  }

  const { Autocomplete } = await ensurePlacesLoaded();

  // Clean up any previous instances/listeners before re-creating
  if (placeChangedListener) {
    placeChangedListener.remove();
    placeChangedListener = null;
  }
  if (manualInputListener) {
    el.removeEventListener("input", manualInputListener);
    manualInputListener = null;
  }

  autocomplete = new Autocomplete(el, {
    fields: ["address_components", "geometry", "formatted_address", "place_id"],
    types: ["address"], // only street addresses
    componentRestrictions: { country: ["ZA"] }, // optional
  });

  placeChangedListener = autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place) return;

    // Fill address + meta
    address.value = place.formatted_address || address.value;
    addressPlaceId.value = place.place_id || "";

    const loc = place.geometry?.location;
    if (loc) {
      addressLat.value = loc.lat();
      addressLng.value = loc.lng();
    }
  });

  // Clear meta if user edits text manually after a selection
  manualInputListener = () => {
    addressPlaceId.value = "";
    addressLat.value = "";
    addressLng.value = "";
  };
  el.addEventListener("input", manualInputListener);
}

// When role becomes 'resident', ensure autocomplete is initialized
watch(role, async (r) => {
  if (r === "resident") {
    await initAutocomplete();
  }
});

onMounted(async () => {
  // Load wards
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

  // If user navigates back to this step with role already set
  if (role.value === "resident") {
    await initAutocomplete();
  }
});

onBeforeUnmount(() => {
  if (placeChangedListener) {
    placeChangedListener.remove();
    placeChangedListener = null;
  }
  const el = addressInputRef.value;
  if (el && manualInputListener) {
    el.removeEventListener("input", manualInputListener);
    manualInputListener = null;
  }
  autocomplete = null;
});
</script>

<template>
  <div>
    <label for="role" class="block text-xl mb-4">Select Role</label>

    <Dropdown
      id="role"
      class="w-full md:w-[30rem] mb-1"
      :options="[
        { label: 'Resident', value: 'resident' },
        { label: 'Staff', value: 'staff' },
        { label: 'Community Leader', value: 'communityleader' },
      ]"
      optionLabel="label"
      optionValue="value"
      v-model="role"
      placeholder="Select a role"
    />
    <small class="text-red-500 block mb-4">{{ roleError }}</small>

    <template v-if="role === 'resident'">
      <label for="address" class="block text-xl mb-2">Address</label>

      <!-- Real <input> so Google Places can attach -->
      <input
        id="address"
        ref="addressInputRef"
        type="text"
        class="p-inputtext p-component w-full md:w-[30rem] mb-1"
        v-model="address"
        placeholder="Start typing your street address"
        autocomplete="street-address"
        @keydown.enter.prevent
      />
      <small class="text-red-500 block mb-4">{{ addressError }}</small>

      <label for="ward_code" class="block text-xl mb-2">Ward</label>

      <Dropdown
        id="ward_code"
        class="w-full md:w-[30rem] mb-1"
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
      </Dropdown>

      <small class="text-red-500 block mb-2" v-if="wardsError">{{ wardsError }}</small>
      <small class="text-red-500 block mb-6">{{ wardCodeError }}</small>
    </template>

    <div class="flex justify-between">
      <Button label="Back" severity="secondary" @click="$emit('back')" />
      <Button label="Register" @click="$emit('register')" />
    </div>
  </div>
</template>

<style scoped>
/* If the Google Places dropdown ever hides behind modals/cards */
.pac-container {
  z-index: 10000 !important;
}
</style>
