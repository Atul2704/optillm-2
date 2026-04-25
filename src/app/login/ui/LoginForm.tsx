"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);

  function validateClient() {
    const emailTrimmed = email.trim();
    if (!emailTrimmed.includes("@")) return "Enter a valid email";
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIssues([]);
    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        error?: string;
        user?: { id: string; email: string };
      };
      if (!res.ok) {
        setError(json?.error ?? "Login failed");
        const parsedIssues = Array.isArray((json as { issues?: unknown[] }).issues)
          ? ((json as { issues?: { path?: (string | number)[]; message?: string }[] }).issues ?? [])
              .map((i) =>
                i?.message ? `${Array.isArray(i.path) && i.path.length ? `${String(i.path[0])}: ` : ""}${i.message}` : null,
              )
              .filter(Boolean)
          : [];
        setIssues(parsedIssues as string[]);
        return;
      }
      const userText = json?.user ? `${json.user.email}` : email;
      setSuccess(`Login successful. Welcome ${userText}`);
      window.setTimeout(() => {
        router.replace(next);
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* OAuth Buttons (Coming Soon) */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = `/api/auth/oauth/google?next=${encodeURIComponent(next)}`;
          }}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = `/api/auth/oauth/github?next=${encodeURIComponent(next)}`;
          }}
        >
          Continue with GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
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
        {success ? <div className="text-sm text-emerald-300">{success}</div> : null}
        <Button className="w-full" type="submit" disabled={loading || !email.trim() || password.length < 8}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

