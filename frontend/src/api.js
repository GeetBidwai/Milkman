const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(
  /\/$/,
  ""
);
const API_ORIGIN = new URL(API_BASE_URL).origin;
const ACCESS_TOKEN_KEY = "milkman_access_token";
const REFRESH_TOKEN_KEY = "milkman_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function normalizeErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }
  if (typeof payload === "string") {
    return payload;
  }
  if (payload.detail && typeof payload.detail === "string") {
    return payload.detail;
  }
  if (typeof payload === "object") {
    const messages = [];
    Object.entries(payload).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(", ")}`);
      } else if (typeof value === "string") {
        messages.push(`${field}: ${value}`);
      }
    });
    if (messages.length) {
      return messages.join(" | ");
    }
  }
  return fallbackMessage;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const data = await response.json();
  if (!data.access) {
    clearTokens();
    return false;
  }

  setTokens({ access: data.access, refresh });
  return true;
}

async function apiRequest(path, options = {}, retryOnAuth = true) {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && options.auth && retryOnAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(path, options, false);
    }
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(normalizeErrorMessage(payload, "Request failed"));
  }

  return payload;
}

function withQuery(path, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function getHealth() {
  return apiRequest("/health/");
}

export async function registerUser(payload) {
  return apiRequest("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return apiRequest("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getProfile() {
  return apiRequest("/profile", { auth: true });
}

export async function getProducts(params = {}) {
  return apiRequest(withQuery("/products", params));
}

export async function getCategories(params = {}) {
  return apiRequest(withQuery("/categories", params));
}

export async function createCategory(payload) {
  return apiRequest("/categories", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(categoryId, payload) {
  return apiRequest(`/categories/${categoryId}`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deactivateCategory(categoryId) {
  return apiRequest(`/categories/${categoryId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createProduct(payload) {
  const body = new FormData();
  body.append("category", String(payload.category));
  body.append("name", payload.name);
  body.append("description", payload.description || "");
  body.append("price", String(payload.price));
  body.append("stock_quantity", String(payload.stock_quantity));
  body.append("is_active", String(payload.is_active));
  if (payload.image) {
    body.append("image", payload.image);
  }

  return apiRequest("/products", {
    method: "POST",
    auth: true,
    body,
  });
}

export async function updateProduct(productId, payload) {
  return apiRequest(`/products/${productId}`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deactivateProduct(productId) {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function uploadProductsCsv(file) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest("/products/upload-csv/", {
    method: "POST",
    auth: true,
    body,
  });
}

export async function getSubscriptions(params = {}) {
  return apiRequest(withQuery("/subscriptions", params), { auth: true });
}

export async function getPlans(params = {}) {
  return apiRequest(withQuery("/plans", params));
}

export async function getAdminPlans(params = {}) {
  return apiRequest(withQuery("/admin/plans", params), { auth: true });
}

export async function createPlan(payload) {
  return apiRequest("/admin/plans", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updatePlan(planId, payload) {
  return apiRequest(`/admin/plans/${planId}`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deactivatePlan(planId) {
  return apiRequest(`/admin/plans/${planId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function createSubscription(payload) {
  return apiRequest("/subscriptions", {
    method: "POST",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateSubscription(subscriptionId, payload) {
  return apiRequest(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    auth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteSubscription(subscriptionId) {
  return apiRequest(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getAdminSubscriptions(params = {}) {
  return apiRequest(withQuery("/admin/subscriptions", params), { auth: true });
}

export async function getCustomers(params = {}) {
  return apiRequest(withQuery("/customers", params), { auth: true });
}

export function getMediaUrl(pathOrUrl) {
  if (!pathOrUrl) {
    return "";
  }
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${API_ORIGIN}${pathOrUrl}`;
}
