<script setup>
import FloatingConfigurator from "@/components/FloatingConfigurator.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/utils/auth_helper";

const email = ref("");
const password = ref("");
const checked = ref(false);
const router = useRouter();

const handleLogin = async () => {
  try {
    // call backend
    const res = await login({
      email: email.value,
      password: password.value,
    });
    console.log(res);

    // console.log("Login response:", res.data);

    // store in sessionStorage (so data resets when tab/browser closes)
    // We can do localStorage later if we dont want this
    sessionStorage.setItem("id", res.data.id);
    sessionStorage.setItem("email", res.data.email);
    sessionStorage.setItem("role", res.data.role);
    sessionStorage.setItem("token", res.data.token);
    console.log("Token:", res.data.token);
    console.log("Sessionstorage Token: ", sessionStorage.getItem("token"));
    sessionStorage.setItem("first_name", res.data.first_name);
    sessionStorage.setItem("last_name", res.data.last_name);
    sessionStorage.setItem("JWT", res.data.jwt_token);

    sessionStorage.setItem("lat", res.data.location?.latitude || "-25.757168");
    sessionStorage.setItem("long", res.data.location?.longitude || "28.231682");

    console.log(res.data);
    const redirect = router.currentRoute.value.query.redirect || "/dashboard";

    router.push(redirect);
  } catch (err) {
    console.error("Login failed:", err);
    alert("Invalid credentials");
  }
};
</script>

<template>
  <FloatingConfigurator />
  <div
    class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden"
  >
    <div class="flex flex-col items-center justify-center">
      <!-- existing UI -->
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
          <!-- form -->
          <div>
            <label for="email1" class="block text-xl mb-2">Email</label>
            <InputText
              id="email1"
              type="text"
              placeholder="Email address"
              class="w-full md:w-[30rem] mb-8"
              v-model="email"
            />

            <label for="password1" class="block text-xl mb-2">Password</label>
            <Password
              id="password1"
              v-model="password"
              placeholder="Password"
              :toggleMask="true"
              class="mb-4"
              fluid
              :feedback="false"
            />

            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
              <div class="flex items-center">
                <Checkbox
                  v-model="checked"
                  id="rememberme1"
                  binary
                  class="mr-2"
                />
                <label for="rememberme1">Remember me</label>
              </div>
              <RouterLink to="/register" class="cursor-pointer text-primary">
                Register account
              </RouterLink>
            </div>

            <!-- call handleLogin on click -->
            <Button label="Sign In" class="w-full" @click="handleLogin" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
