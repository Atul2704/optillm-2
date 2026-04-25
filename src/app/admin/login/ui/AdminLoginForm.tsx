"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/overview";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIssues([]);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        error?: string;
        issues?: { path?: (string | number)[]; message?: string }[];
      };
      if (!res.ok) {
        setError(json?.error ?? "Admin login failed");
        const parsedIssues = Array.isArray(json?.issues)
          ? json.issues
              .map((i) =>
                i?.message ? `${Array.isArray(i.path) && i.path.length ? `${String(i.path[0])}: ` : ""}${i.message}` : null,
              )
              .filter(Boolean)
          : [];
        setIssues(parsedIssues as string[]);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Admin email"
        autoComplete="email"
      />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        autoComplete="current-password"
      />
      {error ? <div className="text-sm text-red-300">{error}</div> : null}
      {issues.length > 0 ? (
        <div className="rounded-md border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {issues.map((msg, idx) => (
            <div key={`${msg}-${idx}`}>- {msg}</div>
          ))}
        </div>
      ) : null}
      <Button className="w-full" type="submit" disabled={loading || !email.trim() || password.length < 8}>
        {loading ? "Signing in…" : "Sign in as Admin"}
      </Button>
    </form>
  );
}
