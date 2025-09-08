import { get, post, put, del } from "./api";

export const fetchUsers = () => get("/users");
export const fetchUserById = (id) => get(`/users/${id}`);
export const createUser = (data) => post("/users", data);
export const updateUser = (id, data) => put(`/users/${id}`, data);
export const deleteUser = (id) => del(`/users/${id}`);
