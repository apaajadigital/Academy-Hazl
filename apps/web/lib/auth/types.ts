export const ROLES = [
  "visitor",
  "student",
  "trainer",
  "event_participant",
  "corporate_client",
  "partner",
  "creator",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
  roles: { role: Role }[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  consent: true;
};

export type AuthResponse = {
  accessToken: string;
  user: { id: string; email: string; name: string };
};

/** Structured API error, mirrors the backend envelope (TASK-011). */
export type ApiError = { code: string; message: string; details?: unknown };

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
