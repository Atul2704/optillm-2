"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MeResponse = { user: { id: string; email: string; role?: "ADMIN" | "USER" } | null };

export function AdminNavLink() {
  const pathname = usePathname();
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as MeResponse;
        if (!cancelled) {
          setShow(json?.user?.role === "ADMIN");
        }
      } catch {
        if (!cancelled) setShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!show) return null;

  return (
    <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="/admin/overview">
      Admin
    </Link>
  );
}
