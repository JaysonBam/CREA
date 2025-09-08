// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import Dashboard from "@/views/Dashboard.vue";
import Login from "@/views/pages/auth/Login.vue";
import NotFound from "@/views/pages/NotFound.vue";
import Testcrud from "@/views/pages/testcrud/testcrud.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public
    { path: "/login", name: "login", component: Login, meta: { guestOnly: true } },

    // Protected routes
    {
      path: "/",
      component: AppLayout,
    //   meta: { requiresAuth: true },
      children: [
        // IMPORTANT: no leading slash for children
        { path: "", redirect: { name: "dashboard" } },
        { path: "dashboard", name: "dashboard", component: Dashboard },
        { path: "test-crud", name: "test-crud", component: Testcrud },
        
      ],
    },

    // 404
    { path: "/:pathMatch(.*)*", name: "notfound", component: NotFound },
  ],
});

router.beforeEach((to) => {
  const isAuthenticated = !!localStorage.getItem("token");
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
  const guestOnly = to.matched.some((r) => r.meta.guestOnly);

  if (requiresAuth && !isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (guestOnly && isAuthenticated) {
    return { name: "dashboard" };
  }
});

export default router;
