<script setup>
//Jayden
//This file includes the form fields for the first form in registration

import { useField } from "vee-validate";
defineEmits(["next"]);

const { value: email, errorMessage: emailError } = useField(
  "email",
  undefined,
  { keepValueOnUnmount: true }
);

const { value: phone, errorMessage: phoneError } = useField(
  "phone",
  undefined,
  { keepValueOnUnmount: true }
);

const { value: password, errorMessage: passwordError } = useField(
  "password",
  undefined,
  { keepValueOnUnmount: true }
);

const { value: firstName, errorMessage: firstNameError } = useField(
  "firstName",
  undefined,
  { keepValueOnUnmount: true }
);

const { value: lastName, errorMessage: lastNameError } = useField(
  "lastName",
  undefined,
  { keepValueOnUnmount: true }
);
</script>

<template>
  <div>
    <label for="email1" class="block text-xl mb-2">Email</label>
    <InputText
      id="email1"
      type="email"
      placeholder="Email address"
      class="w-full md:w-[30rem] mb-1"
      v-model="email"
    />
    <small class="text-red-500 block mb-6">{{ emailError }}</small>

    <label for="phone1" class="block text-xl mb-2">Phone Number</label>
    <InputText
      id="phone1"
      type="tel"
      placeholder="Phone number"
      class="w-full md:w-[30rem] mb-1"
      v-model="phone"
    />
    <small class="text-red-500 block mb-6">{{ phoneError }}</small>

    <label for="password1" class="block text-xl mb-2">Password</label>
    <Password
      id="password1"
      v-model="password"
      placeholder="Password"
      :toggleMask="true"
      :feedback="false"
      class="w-full md:w-[30rem] mb-1 [&>input]:w-full"
    />
    <small class="text-red-500 block mb-6">{{ passwordError }}</small>

    <label for="firstName" class="block text-xl mb-2">First Name</label>
    <InputText
      id="firstName"
      type="text"
      placeholder="First Name"
      class="w-full md:w-[30rem] mb-1"
      v-model="firstName"
    />
    <small class="text-red-500 block mb-6">{{ firstNameError }}</small>

    <label for="lastName" class="block text-xl mb-2">Last Name</label>
    <InputText
      id="lastName"
      type="text"
      placeholder="Last Name"
      class="w-full md:w-[30rem] mb-1"
      v-model="lastName"
    />
    <small class="text-red-500 block mb-8">{{ lastNameError }}</small>

    <Button label="Next" class="w-full" @click="$emit('next')" />
  </div>
</template>
