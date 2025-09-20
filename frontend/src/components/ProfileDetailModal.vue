<template>
  <div class="flex flex-col md:flex-row gap-8 items-start">
    <div class="flex flex-col items-center md:items-start mb-6 md:mb-0">
      <img v-if="user.avatar" :src="user.avatar" class="w-24 h-24 rounded-full object-cover mb-4 border-4 border-primary" alt="Avatar" />
      <div v-else class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-5xl text-gray-400 mb-4 border-4 border-primary">
        <i class="pi pi-user"></i>
      </div>
      <div class="text-2xl font-bold mb-1">{{ user.first_name }} {{ user.last_name }}</div>
      <div class="text-primary font-medium capitalize mb-2">{{ user.role }}</div>
      <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold" :class="user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
        {{ user.isActive ? 'Active' : 'Inactive' }}
      </span>
    </div>
    <div class="flex-1 w-full flex flex-col gap-4">
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-gray-500 font-medium">Email</span>
        <span class="text-gray-900 dark:text-gray-100">{{ user.email }}</span>
      </div>
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-gray-500 font-medium">Phone</span>
        <span class="text-gray-900 dark:text-gray-100">{{ user.phone }}</span>
      </div>
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-gray-500 font-medium">User ID</span>
        <span class="text-gray-900 dark:text-gray-100">{{ user.id }}</span>
      </div>
      <div class="flex justify-between items-center border-b pb-2">
        <span class="text-gray-500 font-medium">Created</span>
        <span class="text-gray-900 dark:text-gray-100">{{ formatDate(user.createdAt) }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-500 font-medium">Updated</span>
        <span class="text-gray-900 dark:text-gray-100">{{ formatDate(user.updatedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Expects a user
const props = defineProps({
  user: { type: Object, required: true }
});
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}
</script>