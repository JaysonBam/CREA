// router/index.js
import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layout/AppLayout.vue";
// import Dashboard from "@/views/Dashboard.vue";
import Login from "@/views/pages/auth/Login.vue";
import NotFound from "@/views/pages/NotFound.vue";
import Testcrud from "@/views/pages/testcrud/testcrud.vue";
import Register from "@/views/pages/auth/Register.vue";

import ReportIssue from "@/views/pages/report-issue/ReportIssue.vue";
import Report from "@/views/pages/report/Report.vue";
import UserReports from "@/views/pages/report-issue/UserReports.vue";
import ReportMap from "@/views/pages/report-issue/ReportMap.vue";
import MapPickerTest from '@/views/MapPickerTest.vue';

import Profile from '@/views/pages/Profile.vue';
import WardRequests from '@/views/pages/ward/WardRequests.vue';
import Wards from "@/views/pages/ward/Wards.vue";
import WardProfile from "@/views/pages/ward/WardProfile.vue";
import WardStats from "@/views/pages/ward/WardStats.vue";

import StateChanges from "@/views/pages/stateMachine/StateChanges.vue";
import ManageReportIssue from "@/views/pages/report/ManageReportIssue.vue";
import StaffWorkloadDashboard from "@/views/pages/staff-workload/StaffWorkloadDashboard.vue";
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
    { path: "", redirect: { name: "report-issue" } },
        { path: "test-crud", name: "test-crud", component: Testcrud },
  { path: "report-issue", name: "report-issue", component: ReportIssue },
  { path: "reports", name: "reports", component: Report },
        {path: "user-reports", name: "user-reports", component: UserReports},
        {path: "report-map", name: "report-map", component: ReportMap},
        { path: "profile", name: "profile", component: Profile },
        { path: "my-ward-report-issues", name: "my-ward-report-issues", component: ManageReportIssue },
        { path: "staff-workload", name: "staff-workload", component: StaffWorkloadDashboard },

        {
          path: "ward-requests",
          name: "ward-requests",
          component: WardRequests,
          meta: { requiresAuth: true },
        },

        { path: "wards", name: "wards", component: Wards },
        {
          path: "wards/:wardId/profile",
          name: "ward-profile",
          component: WardProfile,
          props: true,
        },
        {
          path: "wards/:wardId/stats",
          name: "ward-stats",
          component: WardStats,
          props: true,
        },

        {path: "state-updates", name: "state-updates", component: StateChanges},

      ],
    },

    // 404
    { path: "/:pathMatch(.*)*", name: "notfound", component: NotFound },
  ],
});

router.beforeEach(async (to) => {
  const token = sessionStorage.getItem("JWT");
  const isAuthenticated = !!token;
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
  const guestOnly = to.matched.some((r) => r.meta.guestOnly);

  let userRole = null;
  let userWardAssigned = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userRole = payload.role;
      // Fetch user info from API for accurate ward assignment check
      let userInfo = null;
      try {
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          userInfo = data.user;
        }
      } catch {}
      userWardAssigned = userInfo && userInfo.ward_id && userInfo.ward_name && userInfo.ward_code;
      const isExpired = Date.now() >= payload.exp * 1000;
      if (isExpired) {
        sessionStorage.removeItem("JWT");
        return { name: "login", query: { redirect: to.fullPath } };
      }
    } catch (e) {
      console.error("Invalid JWT:", e);
      sessionStorage.removeItem("JWT");
      return { name: "login" };
    }
  }

  if (requiresAuth && !isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (guestOnly && isAuthenticated) {
    return { name: "reports" };
  }
  // Ward Requests: allow admin OR communityleader with assigned ward
  if (to.name === 'ward-requests' && !(userRole === 'admin' || (userRole === 'communityleader' && userWardAssigned))) {
    return { name: "reports" };
  }
});

export default router;
