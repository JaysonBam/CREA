<script setup>
//Jayden
//This file includes the fields for the second form in registration

import { ref, onMounted } from "vue";
import { useField } from "vee-validate";
import { getAllWards } from "@/utils/ward_helper";
defineEmits(["back", "register"]);

// Role (unchanged)
const { value: role, errorMessage: roleError } = useField("role", undefined, {
  keepValueOnUnmount: true,
});

// Resident-only fields (present in form state; required only when role === 'resident')
const { value: address, errorMessage: addressError } = useField(
  "address",
  undefined,
  { keepValueOnUnmount: true }
);

// This is what gets submitted to the backend
const { value: wardCode, errorMessage: wardCodeError } = useField(
  "ward_code",
  undefined,
  { keepValueOnUnmount: true }
);

// Wards dropdown state
const wards = ref([]);
const wardsLoading = ref(false);
const wardsError = ref("");

// Fetch wards on mount
onMounted(async () => {
  try {
    wardsLoading.value = true;
    const res = await getAllWards();
    // expecting { success, data: [{ id, name, code }, ...] }
    wards.value = Array.isArray(res?.data?.data) ? res.data.data : [];
  } catch (e) {
    wardsError.value =
      e?.response?.data?.message || e?.message || "Failed to load wards";
  } finally {
    wardsLoading.value = false;
  }
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

    <!-- Dynamic fields for Resident -->
    <template v-if="role === 'resident'">
      <label for="address" class="block text-xl mb-2">Address</label>
      <InputText
        id="address"
        type="text"
        placeholder="Street address"
        class="w-full md:w-[30rem] mb-1"
        v-model="address"
      />
      <small class="text-red-500 block mb-4">{{ addressError }}</small>

      <label for="ward_code" class="block text-xl mb-2">Ward</label>

      <!-- Searchable Dropdown: filters on name and code; stores the ward's code in ward_code -->
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
        <!-- Selected value template (shows name (code)) -->
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

        <!-- Each item template -->
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
