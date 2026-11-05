const apiBase = import.meta.env.VITE_API_URL || "";
let csrfToken;
let csrfTokenRequest;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${apiBase}/api/auth/csrf`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not start a secure session. Please try again.");
        ({ csrfToken } = await response.json());
        return csrfToken;
      })
      .catch((error) => {
        csrfTokenRequest = undefined;
        throw error;
      });
  }
  return csrfTokenRequest;
}

export async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  const request = { ...options, method, headers, credentials: "include" };
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== "string") {
    headers.set("Content-Type", "application/json");
    request.body = JSON.stringify(options.body);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers.set("X-CSRF-Token", await getCsrfToken());
  }

  const response = await fetch(`${apiBase}/api${path}`, request);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 403 && /csrf/i.test(payload?.error || "")) {
      csrfToken = undefined;
      csrfTokenRequest = undefined;
    }
    const error = new Error(payload?.error || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function apiUrl(path) {
  return `${apiBase}/api${path}`;
}
