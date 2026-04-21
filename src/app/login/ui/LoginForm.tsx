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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
          className="w-full opacity-50 cursor-not-allowed"
          disabled
        >
          Continue with Google (Coming Soon)
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full opacity-50 cursor-not-allowed"
          disabled
        >
          Continue with GitHub (Coming Soon)
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
        {success ? <div className="text-sm text-emerald-300">{success}</div> : null}
        <Button className="w-full" type="submit" disabled={loading || !email.trim() || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

