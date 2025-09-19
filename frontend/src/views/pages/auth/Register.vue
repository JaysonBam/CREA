<script setup>
//Jayden
//This page was created with the help of Chatgpt by combining the login page template and the multistep form specified in menuDocs (https://sakai.primevue.org/uikit/menu)
import FloatingConfigurator from "@/components/FloatingConfigurator.vue";
import { ref, toRaw } from "vue";
import { useRouter } from "vue-router";

import RegisterDetailsStep from "./RegisterDetailsStep.vue";
import RegisterRoleStep from "./RegisterRoleStep.vue";

import { useForm } from "vee-validate";
import { registerStep1Schema } from "@/schemas/RegisterStep1Schema";
import { registerStep2Schema } from "@/schemas/RegisterStep2Schema";
import { register } from "@/utils/auth_helper";
import { useToast } from "primevue/usetoast";
import { sendToast } from "@/utils/sendToast";

const router = useRouter();
const step = ref(1);
const toast = useToast();

//Init
//==============================
const { values, errors, setErrors, setFieldError, handleSubmit } = useForm({
  initialValues: {
    email: "",
    phone: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "",
    // Added for resident-specific step (only required when role === 'resident')
    address: "",
    ward_code: "",
  },
});

//Function to get the validation errors, passed from ZOD (frontend validation, specified in schemas)
function setZodErrors(issues) {
  const bag = {};
  for (const i of issues) {
    const f = String(i.path?.[0] ?? "");
    if (f) {
      if (!bag[f]) bag[f] = i.message;
      setFieldError(f, i.message);
    }
  }
  setErrors(bag);
}

//Continues to next step, but also ensures that the response keeps step1 data.
function nextStep() {
  const raw = toRaw(values);
  const r = registerStep1Schema.safeParse(raw);
  if (!r.success) {
    setZodErrors(r.error.issues);
    return;
  }
  step.value = 2;
}

function prevStep() {
  step.value = 1;
}

//final step, adds the data from the previous step with the data of this step, sends that to the backend and then toast.
const handleRegister = handleSubmit(async () => {
  const raw = toRaw(values);
  const r = registerStep2Schema.safeParse(raw);
  if (!r.success) {
    setZodErrors(r.error.issues);
    return;
  }
  const payload = { ...raw };
  await sendToast(toast, register(payload));
  router.push("/login");
});
</script>

<template>
  <FloatingConfigurator />
  <div
    class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden"
  >
    <div class="flex flex-col items-center justify-center">
      <div
        style="
          border-radius: 56px;
          padding: 0.3rem;
          background: linear-gradient(
            180deg,
            var(--primary-color) 10%,
            rgba(33, 150, 243, 0) 30%
          );
        "
      >
        <div
          class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20"
          style="border-radius: 53px"
        >
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold">Register</h2>
            <p class="text-muted-color">Step {{ step }} of 2</p>
          </div>

          <RegisterDetailsStep
            v-if="step === 1"
            :errors="errors"
            @next="nextStep"
          />

          <RegisterRoleStep
            v-else
            :errors="errors"
            @back="prevStep"
            @register="handleRegister"
          />
        </div>
      </div>
    </div>
  </div>
</template>
