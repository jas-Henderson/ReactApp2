// src/services/api.js
import axios from "axios";

/**
 * Resolve the API base URL.
 * Priority:
 *  1) VITE_BACKEND_BASE_URL (explicit)
 *  2) If using emulators (env or localhost), build the Functions emulator URL
 *     http://127.0.0.1:5002/<projectId>/<region>/api
 */
function resolveBaseURL() {
  // 1) Explicit override
  const explicit = import.meta.env.VITE_BACKEND_BASE_URL?.trim();
  if (explicit) return explicit;

  // 2) Emulator fallback
  const usingEmulators =
    import.meta.env.VITE_USE_EMULATORS === "1" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (usingEmulators) {
    const projectId =
      import.meta.env.VITE_FIREBASE_PROJECT_ID || "reactapp2-8057f";
    const region = import.meta.env.VITE_FUNCTIONS_REGION || "us-central1";
    const url = `http://127.0.0.1:5002/${projectId}/${region}/api`;
    console.warn(
      `[api] Using Functions emulator baseURL: ${url} (projectId=${projectId}, region=${region})`
    );
    return url;
  }

  // 3) If we get here, we’re likely in production but no URL provided.
  // Throwing helps surface misconfiguration early.
  throw new Error(
    "VITE_BACKEND_BASE_URL is not set and emulator mode is off. Set VITE_BACKEND_BASE_URL in your .env."
  );
}

const baseURL = resolveBaseURL();

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

/* ------------------------------------------------------------------ */
/* Auth header helpers                                                */
/* ------------------------------------------------------------------ */

/** Set a Bearer token globally (call once after login). */
export function setAuthToken(idToken) {
  if (idToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${idToken}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/** Clear Authorization header. */
export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

/* ------------------------------------------------------------------ */
/* Public APIs                                                        */
/* ------------------------------------------------------------------ */

export async function listProducts(params = {}) {
  const { data } = await api.get("/products", { params });
  return data; // { products: [...] }
}

export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data; // { id, name, priceCents, ... }
}

export async function createCheckoutSession(items) {
  const { data } = await api.post("/checkout/create-session", { items });
  return data; // { url }
}

/* ------------------------------------------------------------------ */
/* (Optional) Identity helpers (only if you later add these routes)   */
/* ------------------------------------------------------------------ */

export async function fetchMe() {
  const { data } = await api.get("/me");
  return data;
}

export async function getAdminStatus(idToken) {
  const { data } = await api.get("/admin/me", withAuth(idToken));
  return data; // { admin: true/false, ... }
}

/* ------------------------------------------------------------------ */
/* Admin: Products (require admin token)                              */
/* ------------------------------------------------------------------ */

export async function adminListProducts(idToken) {
  const { data } = await api.get("/admin/products", withAuth(idToken));
  return data; // { products: [...] }
}

export async function createProduct(product, idToken) {
  const { data } = await api.post("/admin/products", product, withAuth(idToken));
  return data; // { id, ...product }
}

export async function updateProduct(id, updates, idToken) {
  const { data } = await api.put(`/admin/products/${id}`, updates, withAuth(idToken));
  return data; // { id, ...updatedProduct }
}

export async function deleteProduct(id, idToken) {
  const { data } = await api.delete(`/admin/products/${id}`, withAuth(idToken));
  return data; // { ok: true }
}

/* ------------------------------------------------------------------ */
/* 🔹 Admin: Upload product image (multipart/form-data)               */
/* ------------------------------------------------------------------ */

export async function uploadProductImage(file, idToken) {
  const formData = new FormData();
  formData.append("file", file);

  const cfg = withAuth(idToken);
  cfg.headers = {
    ...(cfg.headers || {}),
    "Content-Type": "multipart/form-data",
  };

  const { data } = await api.post("/admin/upload", formData, cfg);
  return data; // { url, path }
}

/* ------------------------------------------------------------------ */
/* Admin: Alerts (low stock)                                          */
/* ------------------------------------------------------------------ */

export async function adminListAlerts(idToken) {
  const { data } = await api.get("/admin/alerts", withAuth(idToken));
  return data; // { unresolved: [...], recentResolved: [...] }
}

export async function resolveAlert(alertId, idToken) {
  const { data } = await api.post(
    `/admin/alerts/${alertId}/resolve`,
    {},
    withAuth(idToken)
  );
  return data; // { ok: true }
}

/* ------------------------------------------------------------------ */
/* Local Dev: Seed products                                           */
/* ------------------------------------------------------------------ */

export async function seedProducts(payload /* { products: [...] } */, idToken) {
  const { data } = await api.post("/admin/seed", payload, withAuth(idToken));
  return data; // { ok: true, count }
}

/* ------------------------------------------------------------------ */
/* Util                                                               */
/* ------------------------------------------------------------------ */

function withAuth(idToken) {
  return idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {};
}