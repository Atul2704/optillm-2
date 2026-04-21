import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/ui/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Sign in to access dashboard and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <div className="text-sm text-white/70">
            Don’t have an account?{" "}
            <Link className="text-white hover:underline" href="/register">
              Create one
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

