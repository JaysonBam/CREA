<script setup>
//Jayden
//This file includes the fields for the second form in registration

import { useField } from "vee-validate";
defineEmits(["back", "register"]);

const { value: role, errorMessage: roleError } = useField("role", undefined, {
  keepValueOnUnmount: true,
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
    <small class="text-red-500 block mb-8">{{ roleError }}</small>

    <div class="flex justify-between">
      <Button label="Back" severity="secondary" @click="$emit('back')" />
      <Button label="Register" @click="$emit('register')" />
    </div>
  </div>
</template>
