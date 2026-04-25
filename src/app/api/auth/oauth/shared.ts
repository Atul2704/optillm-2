import { randomBytes } from "crypto";

export const OAUTH_STATE_COOKIE = "optillm_oauth_state";
export const OAUTH_NEXT_COOKIE = "optillm_oauth_next";

export function randomState() {
  return randomBytes(16).toString("hex");
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export function sanitizeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  return next;
}
