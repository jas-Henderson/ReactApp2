// src/services/api.js
import axios from "axios";

/**
 * Base Axios client for your Firebase Functions API.
 * Example baseURL (emulator):
 *   http://127.0.0.1:5002/reactapp2-8057f/us-central1/api
 */
const baseURL = import.meta.env.VITE_BACKEND_BASE_URL;
export const api = axios.create({
  baseURL,
  timeout: 15000,
});

/* ------------------------------------------------------------------ */
/* Optional helpers to manage the Authorization header globally       */
/* ------------------------------------------------------------------ */

/** Set a static Bearer token on the client (e.g., after login). */
export function setAuthToken(idToken) {
  if (idToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${idToken}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

/** Clear any previously set Authorization header. */
export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

/* ------------------------------------------------------------------ */
/* Public APIs                                                        */
/* ------------------------------------------------------------------ */

/** List products (supports query, category, sort) */
export async function listProducts(params = {}) {
  const { data } = await api.get("/products", { params });
  return data; // { products: [...] }
}

/** Get single product by ID */
export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data; // { id, name, priceCents, ... }
}

/** Create a Stripe Checkout session */
export async function createCheckoutSession(items) {
  const { data } = await api.post("/checkout/create-session", { items });
  return data; // { url }
}

/* ------------------------------------------------------------------ */
/* Auth / Admin helpers                                               */
/* ------------------------------------------------------------------ */

/** Optional: whoami-style endpoint (if implemented on backend) */
export async function fetchMe() {
  const { data } = await api.get("/me");
  return data; // e.g., { user, roles, admin }
}

/** Check admin status for current Firebase user (token required) */
export async function getAdminStatus(idToken) {
  const { data } = await api.get("/admin/me", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return data; // { admin: true/false }
}

/* ------------------------------------------------------------------ */
/* Admin Product APIs (require Bearer token)                          */
/* Pass idToken if you are NOT using setAuthToken() above.            */
/* ------------------------------------------------------------------ */

/** Admin: list products */
export async function adminListProducts(idToken) {
  const { data } = await api.get("/admin/products", withAuth(idToken));
  return data; // { products: [...] }
}

/** Admin: create a product */
export async function createProduct(product, idToken) {
  const { data } = await api.post("/admin/products", product, withAuth(idToken));
  return data; // { id, ...product }
}

/** Admin: update a product */
export async function updateProduct(id, updates, idToken) {
  const { data } = await api.put(`/admin/products/${id}`, updates, withAuth(idToken));
  return data; // { id, ...updatedProduct }
}

/** Admin: delete a product */
export async function deleteProduct(id, idToken) {
  const { data } = await api.delete(`/admin/products/${id}`, withAuth(idToken));
  return data; // { ok: true }
}

/** Admin: upload product image (expects a File) */
export async function uploadProductImage(file, idToken) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/upload", formData, {
    ...withAuth(idToken).headers && { headers: withAuth(idToken).headers },
    headers: {
      ...(withAuth(idToken).headers || {}),
      "Content-Type": "multipart/form-data",
    },
  });

  return data; // { url: "https://..." }
}

/* ------------------------------------------------------------------ */
/* Utility                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a config object with Authorization header if an idToken is provided.
 * If you already called setAuthToken(), you can omit idToken.
 */
function withAuth(idToken) {
  return idToken
    ? { headers: { Authorization: `Bearer ${idToken}` } }
    : {}; // rely on api.defaults if setAuthToken() was used
}