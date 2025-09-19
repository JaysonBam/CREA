import api, { get, post, put, del } from "./api";

export const getAllWards = () => {
  return get("/api/wards");
};
