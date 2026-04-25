import Link from "next/link";
import { RegisterForm } from "@/app/register/ui/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Set up your profile and secure login details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm />
          <div className="text-sm text-white/70">
            Already have an account?{" "}
            <Link className="text-white hover:underline" href="/login">
              Login
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

