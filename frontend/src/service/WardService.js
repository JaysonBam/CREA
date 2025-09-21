//WardService
const API_BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/$/, "") ||
  "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token"); 
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Try to parse JSON
  let data;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed: ${res.status}`);
  }
  return data?.data ?? data; // backend wraps in { success, message, data }
}

// ---- Public API ----

// GET /api/wards
export function listWards() {
  return http("GET", "/api/wards");
}

// GET /api/wards/detailed
export function listWardsDetailed() {
  return http("GET", "/api/wards/detailed");
}

// GET /api/wards/:id
export function getWardById(id) {
  return http("GET", `/api/wards/${id}`);
}

// POST /api/wards 
export function createWard(payload /* { name, code } */) {
  return http("POST", "/api/wards", payload);
}

// PUT /api/wards/:id 
export function updateWard(id, payload /* { name?, code? } */) {
  return http("PUT", `/api/wards/${id}`, payload);
}

// DELETE /api/wards/:id 
export function deleteWard(id) {
  return http("DELETE", `/api/wards/${id}`);
}

export default {
  listWards,
  listWardsDetailed,
  getWardById,
  createWard,
  updateWard,
  deleteWard,
};