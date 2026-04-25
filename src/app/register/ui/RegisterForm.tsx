"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [jobTitle, setJobTitle] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);

  function validateClient() {
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters";
    if (!/^[+]?[0-9\s\-()]{10,20}$/.test(phoneNumber.trim())) return "Enter a valid phone number";
    if (!email.trim().includes("@")) return "Enter a valid email";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return "Password must include uppercase, lowercase, and number";
    }
    if (password !== confirmPassword) return "Passwords do not match";
    if (!country.trim()) return "Country is required";
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          companyName: companyName.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          country,
          email,
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Registration failed");
        const parsedIssues = Array.isArray(json?.issues)
          ? json.issues
              .map((i: { path?: (string | number)[]; message?: string }) =>
                i?.message ? `${Array.isArray(i.path) && i.path.length ? `${String(i.path[0])}: ` : ""}${i.message}` : null,
              )
              .filter(Boolean)
          : [];
        setIssues(parsedIssues as string[]);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = "/api/auth/oauth/google?next=/dashboard";
          }}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = "/api/auth/oauth/github?next=/dashboard";
          }}
        >
          Continue with GitHub
        </Button>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
      <Input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        type="text"
        placeholder="Full name"
        autoComplete="name"
      />
      <Input
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        type="tel"
        placeholder="Phone number"
        autoComplete="tel"
      />
      <Input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        type="text"
        placeholder="Company name (optional)"
        autoComplete="organization"
      />
      <Input
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        type="text"
        placeholder="Job title (optional)"
        autoComplete="organization-title"
      />
      <Input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        type="text"
        placeholder="Country"
        autoComplete="country-name"
      />
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
        placeholder="Password (min 8 chars, Aa1)"
        autoComplete="new-password"
      />
      <Input
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        type="password"
        placeholder="Confirm password"
        autoComplete="new-password"
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
        {loading ? "Creating…" : "Create account"}
      </Button>
      </form>
    </div>
  );
}

