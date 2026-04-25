import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLoginForm } from "@/app/admin/login/ui/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in with an admin account to access admin console.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            <Link
              className="rounded-lg px-3 py-2 text-center text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              href="/login"
            >
              User Login
            </Link>
            <Link
              className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm font-medium text-white"
              href="/admin/login"
            >
              Admin Login
            </Link>
          </div>
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
          <div className="text-sm text-white/70">
            Not an admin?{" "}
            <Link className="text-white hover:underline" href="/login">
              User login
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
