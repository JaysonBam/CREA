<script setup>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
  computed,
} from "vue";
import { useField } from "vee-validate";
import { getAllWards } from "@/utils/ward_helper";
import { Loader } from "@googlemaps/js-api-loader";

defineEmits(["back", "register"]);

const showRoleError = computed(() => !role.value);
// ---- vee-validate fields ----
const { value: role, errorMessage: roleError } = useField("role", undefined, {
  keepValueOnUnmount: true,
});

const { value: address, errorMessage: addressError } = useField(
  "address",
  undefined,
  { keepValueOnUnmount: true }
);

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

// ---- data ----
const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref("");

// For rendering the selected ward label without an inline function in template
const selectedWardLabel = computed(() => {
  if (!wardCode.value) return "";
  const w = wards.value?.find((x) => x.code === wardCode.value);
  return w ? `${w.name} (${w.code})` : wardCode.value;
});

// ----- Google Places -----
const addressInputRef = ref(null);
let autocomplete = null;
let placeChangedListener = null;
let manualInputListener = null;
let loadingMaps = false;
let mapsReady = false;

async function ensurePlacesLoaded() {
  if (mapsReady) return true;
  if (loadingMaps) {
    // small spin-wait to avoid double loads
    while (loadingMaps && !mapsReady) {
      await new Promise((r) => setTimeout(r, 30));
    }
    return mapsReady;
  }

  loadingMaps = true;
  try {
    if (!window.google?.maps) {
      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        version: "weekly",
        // don't rely on "libraries" here; we will use importLibrary
      });
      await loader.load();
    }
    // Import the Places library (_after_ maps script is ready)
    await google.maps.importLibrary("places");
    mapsReady = true;
    return true;
  } catch (e) {
    console.error("Failed to load Google Maps Places:", e);
    mapsReady = false;
    return false;
  } finally {
    loadingMaps = false;
  }
}

async function initAutocomplete() {
  // Only for resident role and when input is present
  if (role.value !== "resident") return;

  await nextTick();

  // Prime inputs can sometimes be wrappers; accept native input or try to find one
  let el = addressInputRef.value;
  if (!(el instanceof HTMLInputElement)) {
    el = el?.querySelector?.("input") || null;
  }
  if (!el) return; // nothing to attach to yet

  const ok = await ensurePlacesLoaded();
  if (!ok || !google?.maps?.places?.Autocomplete) return;

  // Clean previous
  if (placeChangedListener) {
    placeChangedListener.remove();
    placeChangedListener = null;
  }
  if (manualInputListener && el) {
    el.removeEventListener("input", manualInputListener);
    manualInputListener = null;
  }

  autocomplete = new google.maps.places.Autocomplete(el, {
    fields: ["address_components", "geometry", "formatted_address", "place_id"],
    types: ["address"],
    componentRestrictions: { country: ["ZA"] },
  });

  placeChangedListener = autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace?.();
    if (!place) return;

    address.value = place.formatted_address || address.value || "";
    addressPlaceId.value = place.place_id || "";

    const loc = place.geometry?.location;
    if (loc) {
      // guard against null; call functions only if present
      addressLat.value = typeof loc.lat === "function" ? loc.lat() : "";
      addressLng.value = typeof loc.lng === "function" ? loc.lng() : "";
    }
  });

  // If user edits text after selecting a place, clear meta fields
  manualInputListener = () => {
    addressPlaceId.value = "";
    addressLat.value = "";
    addressLng.value = "";
  };
  el.addEventListener("input", manualInputListener);
}

// Re-init autocomplete whenever role becomes 'resident'
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
  // Clean listeners
  if (placeChangedListener) {
    placeChangedListener.remove();
    placeChangedListener = null;
  }
  const el =
    addressInputRef.value instanceof HTMLInputElement
      ? addressInputRef.value
      : addressInputRef.value?.querySelector?.("input");

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

    <template v-if="role === 'resident'">
      <label for="address" class="block text-xl mb-2">Address</label>

      <!-- Real input so Google Places can attach; wrapper-safe via initAutocomplete -->
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
          <span v-else>{{ selectedWardLabel }}</span>
        </template>

        <template #option="{ option }">
          <div class="flex flex-col">
            <span class="font-medium">{{ option.name }}</span>
            <span class="text-sm text-muted-color">{{ option.code }}</span>
          </div>
        </template>
      </Dropdown>

      <small class="text-red-500 block mb-2" v-if="wardsError">{{
        wardsError
      }}</small>
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
