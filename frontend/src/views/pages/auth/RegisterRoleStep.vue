<script setup>
// Jayden
// Second step of registration: role + (if resident) address + ward

import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useField } from "vee-validate";
import { getAllWards } from "@/utils/ward_helper";
import { Loader } from "@googlemaps/js-api-loader";

defineEmits(["back", "register"]);

// ----- vee-validate fields -----
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

// ----- wards list -----
const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref("");

// ----- Google Places -----
const addressInputRef = ref(null); // real <input> element
let autocomplete;
let placeChangedListener;

// Initialize Places Autocomplete AFTER the input is in the DOM
async function initAutocomplete() {
  await nextTick();

  const el = addressInputRef.value;
  if (!(el instanceof HTMLInputElement)) {
    // If you ever swap to PrimeVue <InputText>, find its inner input:
    // const real = el?.$el?.querySelector("input");
    // if (!(real instanceof HTMLInputElement)) return;
    return;
  }

  // Load Maps JS + Places only if not already loaded
  if (!window.google?.maps?.places) {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places"],
    });
    await loader.load();
  }

  autocomplete = new google.maps.places.Autocomplete(el, {
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
  el.addEventListener("input", () => {
    addressPlaceId.value = "";
    addressLat.value = "";
    addressLng.value = "";
  });
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
  if (placeChangedListener) placeChangedListener.remove();
});
</script>

<template>
  <div>
    <label for="role" class="block text-xl mb-4">Select Role</label>

    <!-- Keep Dropdown for now; PrimeVue v4 warns it's deprecated in favor of <Select> -->
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
