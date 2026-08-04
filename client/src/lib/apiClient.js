// API client — centralised fetch wrapper for all server calls.
// Uses relative URLs so the Vite proxy handles routing in dev.

const API_BASE = "/api";
const AUTH_BASE = "/auth";
const PUBLIC_BASE = "/public";

function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.code === "TOKEN_EXPIRED") {
      // Attempt token refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry original request with new token
        return fetch(url, {
          ...options,
          headers: { ...getHeaders(), ...options.headers },
        }).then(handleResponse);
      }
    }
    // Clear auth and redirect to login
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
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

async function refreshToken() {
  const refresh = localStorage.getItem("refreshToken");
  if (!refresh) return false;

  try {
    const res = await fetch(`${AUTH_BASE}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── Auth ──
export async function login(email, name) {
  const data = await request(`${AUTH_BASE}/login`, {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  return data;
}

export async function fetchMe() {
  return request(`${AUTH_BASE}/me`);
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
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
  return request(`${API_BASE}/bookings/${bookingId}`, { method: "DELETE" });
}

// ── Approvals ──
export async function fetchPendingApprovals() {
  return request(`${API_BASE}/bookings/pending-approvals`);
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
  return request(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role, approverTier }),
  });
}

export async function fetchAuditLogs() {
  return request(`${API_BASE}/admin/audit-logs`);
}

// ── Public ──
export async function fetchPublicAvailability(startDate, endDate, venueId) {
  const params = new URLSearchParams({ startDate, endDate });
  if (venueId) params.set("venueId", venueId);
  // No auth header for public endpoint
  const res = await fetch(`${PUBLIC_BASE}/availability?${params}`);
  return handleResponse(res);
}
