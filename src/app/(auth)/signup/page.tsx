import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SignupPage() {
  return (
    <Card className="rounded-[32px]">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent2)]">
          Create Account
        </p>
        <CardTitle>Create your Chatty account</CardTitle>
        <CardDescription>
          Create an account with email and password or continue with Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthForm mode="signup" />
        <GoogleButton mode="signup" />

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.22em] text-white/45">
          <span>Already have access?</span>
          <Link
            className="text-[var(--accent3)] hover:text-white"
            href="/login"
          >
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
