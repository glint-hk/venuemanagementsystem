// API client — centralised fetch wrapper for all server calls.
// Uses relative URLs so the Vite proxy handles routing in dev.

const API_BASE = "/api";
const AUTH_BASE = "/auth";
const PUBLIC_BASE = "/public";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
 
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
 
async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
 
  if (res.status === 401) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Authentication required");
  }
 
  return handleResponse(res);
}
 
async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || `Request failed: ${res.status}`);
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
// POST /auth/login (routes/auth.js) handles both paths through one endpoint:
// - dev mode: body { email, name } — server trusts these directly and
//   auto-registers a BOOKER on first login.
// - Google SSO: body { idToken } — server verifies it against Google and
//   derives email/name from the verified payload; any email/name also sent
//   in the body is ignored in that case.
// Either way the response is { message, token, user }, not { accessToken,
// refreshToken } — there is no refresh token in this system.
async function performLogin(body) {
  const data = await request(`${AUTH_BASE}/login`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  storeSession(data.token, data.user);
  return data;
}
 
export async function login(email, name) {
  return performLogin({ email, name });
}
 
// idToken is the Google Identity Services credential (a signed JWT) produced
// by the button wired up in LoginPage.jsx. The server — not the client —
// verifies it and enforces the institutional domain restriction.
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
  if (filters.attribute) params.set("attributes", filters.attribute);
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
  return request(`${API_BASE}/bookings/${bookingId}/cancel`);
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
  return request(`${AUTH_BASE}/roles/elevate/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ userId, role, approverTier }),
  });
}

export async function fetchAuditLogs() {
  return request(`${API_BASE}/admin/logs`);
}

// ── Public ──
export async function fetchPublicAvailability(venueId) {
  const res = await fetch(`${PUBLIC_BASE}/availability?${venueId}`);
  return handleResponse(res);
}
