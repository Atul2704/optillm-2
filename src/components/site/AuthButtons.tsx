"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type MeResponse = { user: { id: string; email: string } | null };

export function AuthButtons() {
  const pathname = usePathname();
  const [me, setMe] = React.useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as MeResponse;
        if (!cancelled) setMe(json.user);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (loading) return null;

  if (!me) {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/login?next=${encodeURIComponent(pathname ?? "/dashboard")}`}>
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary" size="sm">
            Sign up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="max-w-[180px] truncate text-xs text-white/60 sm:max-w-[260px]">{me.email}</div>
      <Link href={`/logout?next=${encodeURIComponent(pathname ?? "/login")}`}>
        <Button variant="ghost" size="sm">
          Logout
        </Button>
      </Link>
    </div>
  );
}

