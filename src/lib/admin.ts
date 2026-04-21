import { getCurrentUser } from "@/lib/auth";

function parseAllowlist(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, user: null, reason: "unauthorized" as const };

  const allow = parseAllowlist(process.env.ADMIN_EMAILS);
  const isAdmin = allow.includes(user.email.toLowerCase());
  if (!isAdmin) return { ok: false as const, user, reason: "forbidden" as const };

  return { ok: true as const, user };
}

