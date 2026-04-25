import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminAccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin Access Denied</CardTitle>
          <CardDescription>
            You are logged in, but your account does not have admin permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-white/70">
            Ask an existing admin to add your email to the <code>ADMIN_EMAILS</code> allowlist.
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline">Open analytics</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
