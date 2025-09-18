import api, { get, post, put, del } from "./api";

export const listTestCrud = () => api.get("/api/test-crud");
export const getTestCrud = (token) => api.get(`/api/test-crud/${token}`);
export const createTestCrud = (data) => api.post("/api/test-crud", data);
export const updateTestCrud = (token, data) =>
  api.put(`/api/test-crud/${token}`, data);
export const deleteTestCrud = (token) => api.delete(`/api/test-crud/${token}`);


// --- Issue Reports ---
/**
 * Lists issue reports.
 * @param {object} [params] - Optional query parameters.
 * @param {number} params.sw_lat - South-West corner latitude.
 * @param {number} params.sw_lng - South-West corner longitude.
 * @param {number} params.ne_lat - North-East corner latitude.
 * @param {number} params.ne_lng - North-East corner longitude.
 */
export const listIssueReports = (params) =>
  api.get("/api/issue-reports", { params });
export const getIssueReport = (token) => api.get(`/api/issue-reports/${token}`);
export const getUserReports = (userToken) => api.get(`/api/issue-reports/user/${userToken}`);
export const createIssueReport = (data) => api.post("/api/issue-reports", data);
export const updateIssueReport = (token, data) =>
  api.put(`/api/issue-reports/${token}`, data);
export const deleteIssueReport = (token) =>
  api.delete(`/api/issue-reports/${token}`);


// --- Locations ---
export const listLocations = () => api.get("/api/locations");
export const getLocation = (token) => api.get(`/api/locations/${token}`);
export const createLocation = (data) => api.post("/api/locations", data);
export const updateLocation = (token, data) =>
  api.put(`/api/locations/${token}`, data);
export const deleteLocation = (token) => api.delete(`/api/locations/${token}`);


// --- File Attachments ---
export const listFileAttachments = () => api.get("/api/file-attachments");
export const getFileAttachment = (token) =>
  api.get(`/api/file-attachments/${token}`);
export const createFileAttachment = (data) =>
  api.post("/api/file-attachments", data);
export const updateFileAttachment = (token, data) =>
  api.put(`/api/file-attachments/${token}`, data);
export const deleteFileAttachment = (token) =>
  api.delete(`/api/file-attachments/${token}`);