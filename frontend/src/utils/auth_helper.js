import api, { get, post, put, del } from "./api";

export const login = (credentials) => {
  return api.post("/api/auth/login", credentials);
};
