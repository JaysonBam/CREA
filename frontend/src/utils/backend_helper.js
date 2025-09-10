import api, { get, post, put, del } from "./api";

export const listTestCrud = () => api.get("/api/test-crud");
export const getTestCrud = (id) => api.get(`/api/test-crud/${id}`);
export const createTestCrud = (data) => api.post("/api/test-crud", data);
export const updateTestCrud = (id, data) =>
  api.put(`/api/test-crud/${id}`, data);
export const deleteTestCrud = (id) => api.delete(`/api/test-crud/${id}`);
