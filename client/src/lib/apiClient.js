// API client — centralised fetch wrapper for all server calls.
// Uses relative URLs so the Vite proxy handles routing in dev.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;
const AUTH_BASE = `${BASE_URL}/auth`;

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
 
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
 
async function request(url, options = {}) {
  const isAuthLogin = url.includes("/auth/login");
  let res;
  
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...options.headers },
    });
  } catch (netErr) {
    console.error("Network fetch error:", netErr);
    throw new Error("Unable to connect to backend server. Please verify the server is running.");
  }
 
  // Intercept 401 for authenticated session expiry ONLY (not for login endpoint)
  if (res.status === 401 && !isAuthLogin) {
    clearSession();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Authentication required");
  }
 
  return handleResponse(res);
}
 
async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
 
function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
 
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
 
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
 
// ── Auth ──
async function performLogin(body) {
  const data = await request(`${AUTH_BASE}/login`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data?.token && data?.user) {
    storeSession(data.token, data.user);
  }
  return data;
}
 
export async function login(email, name) {
  const sanitizedEmail = email ? String(email).trim().toLowerCase() : "";
  const sanitizedName = name ? String(name).trim() : "";
  return performLogin({ email: sanitizedEmail, name: sanitizedName });
}
 
export async function loginWithGoogle(idToken) {
  return performLogin({ idToken });
}
 
export function logout() {
  clearSession();
}

// ── Venues ──
export async function fetchVenues(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.minCapacity) params.set("minCapacity", filters.minCapacity);
  if (filters.attributes) params.set("attributes", filters.attributes);
  const qs = params.toString();
  return request(`${API_BASE}/venues${qs ? `?${qs}` : ""}`);
}

export async function fetchVenue(venueId) {
  return request(`${API_BASE}/venues/${venueId}`);
}

export async function fetchVenueAvailability(venueId, startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  return request(`${API_BASE}/venues/${venueId}/availability?${params}`);
}

export async function createVenue(data) {
  return request(`${API_BASE}/venues`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateVenue(venueId, data) {
  return request(`${API_BASE}/venues/${venueId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteVenue(venueId) {
  return request(`${API_BASE}/venues/${venueId}`, {
    method: "DELETE",
  });
}

// ── Bookings ──
export async function createBooking(data) {
  return request(`${API_BASE}/bookings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchMyBookings() {
  return request(`${API_BASE}/bookings`);
}

export async function fetchBooking(bookingId) {
  return request(`${API_BASE}/bookings/${bookingId}`);
}

export async function modifyBooking(bookingId, data) {
  return request(`${API_BASE}/bookings/${bookingId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(bookingId) {
  return request(`${API_BASE}/bookings/${bookingId}/cancel`, {
    method: "PATCH",
  });
}

// ── Approvals ──
export async function fetchPendingApprovals() {
  return request(`${API_BASE}/bookings/approvals`);
}

export async function submitApprovalDecision(bookingId, decision, comment) {
  return request(`${API_BASE}/bookings/${bookingId}/approve`, {
    method: "POST",
    body: JSON.stringify({ decision, comment }),
  });
}

// ── Admin ──
export async function fetchUsers() {
  return request(`${API_BASE}/admin/users`);
}

export async function elevateRole(userId, role, approverTier) {
  return request(`${AUTH_BASE}/roles/elevate`, {
    method: "PATCH",
    body: JSON.stringify({ userId, role, approverTier }),
  });
}

export async function fetchAuditLogs() {
  return request(`${API_BASE}/admin/logs`);
}

export async function fetchApprovalChains() {
  return request(`${API_BASE}/admin/approval-chains`);
}

export async function createApprovalChain(data) {
  return request(`${API_BASE}/admin/approval-chains`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateApprovalChain(chainId, data) {
  return request(`${API_BASE}/admin/approval-chains/${chainId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── Public ──
export async function fetchPublicAvailability(startAt, endAt, venueId) {
  const params = new URLSearchParams();
  if (startAt) params.set("startAt", startAt);
  if (endAt) params.set("endAt", endAt);
  if (venueId) params.set("venueId", venueId);
  const qs = params.toString();
  try {
    const res = await fetch(`${API_BASE}/public/availability${qs ? `?${qs}` : ""}`);
    return await handleResponse(res);
  } catch (err) {
    console.error("Public availability fetch error:", err);
    throw new Error("Unable to connect to backend server. Please verify the server is running.");
  }
}