// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
import Dashboard from "@/views/Dashboard.vue";
import Login from "@/views/pages/auth/Login.vue";
import NotFound from "@/views/pages/NotFound.vue";
import Testcrud from "@/views/pages/testcrud/testcrud.vue";
import Register from "@/views/pages/auth/Register.vue";

import ReportIssue from "@/views/pages/report-issue/ReportIssue.vue";
import UserReports from "@/views/pages/report-issue/UserReports.vue";
import ReportMap from "@/views/pages/report-issue/ReportMap.vue";
import MapPickerTest from '@/views/MapPickerTest.vue';
import Profile from '@/views/pages/Profile.vue';
import WardRequests from '@/views/pages/ward/WardRequests.vue';
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Standalone test route for MapPicker
    {
      path: "/map-picker-test",
      name: "map-picker-test",
      component: MapPickerTest,
    },
    // Public
    {
      path: "/login",
      name: "login",
      component: Login,
      meta: { guestOnly: true },
    },

    {
      path: "/register",
      name: "register",
      component: Register,
      meta: { guestOnly: true },
    },

    // Protected routes
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        // IMPORTANT: no leading slash for children
        { path: "", redirect: { name: "dashboard" } },
        { path: "dashboard", name: "dashboard", component: Dashboard },
        { path: "test-crud", name: "test-crud", component: Testcrud },
        { path: "report-issue", name: "report-issue", component: ReportIssue },
        {path: "user-reports", name: "user-reports", component: UserReports},
        {path: "report-map", name: "report-map", component: ReportMap},
        { path: "profile", name: "profile", component: Profile },
        {
          path: "ward-requests",
          name: "ward-requests",
          component: WardRequests,
          meta: { requiresAuth: true, adminOnly: true },
        }
      ],
    },

    // 404
    { path: "/:pathMatch(.*)*", name: "notfound", component: NotFound },
  ],
});

router.beforeEach((to) => {
  const token = sessionStorage.getItem("JWT");
  const isAuthenticated = !!token;
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
  const guestOnly = to.matched.some((r) => r.meta.guestOnly);
  const adminOnly = to.matched.some((r) => r.meta.adminOnly);

  let userRole = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userRole = payload.role;
      const isExpired = Date.now() >= payload.exp * 1000;
      if (isExpired) {
        sessionStorage.removeItem("token");
        return { name: "login", query: { redirect: to.fullPath } };
      }
    } catch (e) {
      console.error("Invalid JWT:", e);
      sessionStorage.removeItem("token");
      return { name: "login" };
    }
  }

  if (requiresAuth && !isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (guestOnly && isAuthenticated) {
    return { name: "dashboard" };
  }
  if (adminOnly && userRole !== 'admin') {
    return { name: "dashboard" };
  }
});

export default router;
