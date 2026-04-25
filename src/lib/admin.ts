import { getCurrentUser } from "@/lib/auth";

function parseAllowlist(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type AppRole = "ADMIN" | "USER";

export async function getUserRole(email: string): Promise<AppRole> {
  const allow = parseAllowlist(process.env.ADMIN_EMAILS);
  // Dev-friendly fallback: if no allowlist configured, treat authenticated users as admin.
  if (allow.length === 0) return "ADMIN";
  return allow.includes(email.toLowerCase()) ? "ADMIN" : "USER";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, user: null, reason: "unauthorized" as const };

  const role = await getUserRole(user.email);
  if (role !== "ADMIN") return { ok: false as const, user, reason: "forbidden" as const };

  return { ok: true as const, user, role };
}

