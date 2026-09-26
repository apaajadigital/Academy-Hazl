import type { LoginPayload, RegisterPayload, AuthResponse, AuthUser, ApiResult } from "./types";

// All API calls go through Next.js /api/* proxy rewrite → backend:4000
// Use relative paths to avoid CORS preflight issues with credentials.
const API_PATH = "";  // Empty = relative, Next.js proxy handles routing to backend

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_PATH}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch (err) {
    console.error("[apiFetch] Network error:", err);
    return { success: false, error: { code: "NETWORK_ERROR", message: "Tidak dapat terhubung ke server." } };
  }
}

export async function register(payload: RegisterPayload): Promise<ApiResult<{ userId: string; message: string }>> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<ApiResult<AuthResponse>> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<ApiResult<{ message: string }>> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function refreshToken(): Promise<ApiResult<{ accessToken: string }>> {
  return apiFetch("/api/auth/refresh", { method: "POST" });
}

export async function getMe(accessToken: string): Promise<ApiResult<AuthUser>> {
  return apiFetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function forgotPassword(email: string): Promise<ApiResult<{ message: string }>> {
  return apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<ApiResult<{ message: string }>> {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function verifyEmail(token: string): Promise<ApiResult<{ message: string }>> {
  return apiFetch("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function buildGoogleLoginUrl(): string {
  // Use relative path to go through Next.js proxy — avoids SSR hydration mismatch
  return `/api/auth/google`;
}
