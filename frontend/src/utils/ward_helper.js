import api, { get, post, put, del } from "./api";

export const getAllWards = () => {
  return get("/api/wards");
};

export const getWard = (idOrToken) => {
  return api.get(`/api/wards/${idOrToken}`).then(r => r.data);
};

export const createWard = (payload) => {
  return api.post("/api/wards", payload).then(r => r.data);
};

export const updateWard = (idOrToken, payload) => {
  return api.put(`/api/wards/${idOrToken}`, payload).then(r => r.data);
};

export const deleteWard = (idOrToken) => {
  return api.delete(`/api/wards/${idOrToken}`).then(r => r.data);
};

// Get wards with leader names (id, name, code, leaderId, leaderName)
export const getWardsWithLeaders = () => {
  return api.get('/api/wards/leaders').then((r) => r.data);
};