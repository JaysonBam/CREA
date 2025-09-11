import api, { get, post, put, del } from "./api";

export const listTestCrud = () => api.get("/api/test-crud");
export const getTestCrud = (token) => api.get(`/api/test-crud/${token}`);
export const createTestCrud = (data) => api.post("/api/test-crud", data);
export const updateTestCrud = (token, data) =>
  api.put(`/api/test-crud/${token}`, data);
export const deleteTestCrud = (token) => api.delete(`/api/test-crud/${token}`);
