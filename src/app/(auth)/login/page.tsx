import Link from "next/link";

import { AuthForm } from "@/components/auth/AuthForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <Card className="rounded-[32px]">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent3)]">
          Secure Access
        </p>
        <CardTitle>Sign in to Chatty</CardTitle>
        <CardDescription>
          Sign in with your email and password or continue with Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AuthForm mode="login" />
        <GoogleButton mode="login" />

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.22em] text-white/45">
          <span>New to Chatty?</span>
          <Link
            className="text-[var(--accent2)] hover:text-white"
            href="/signup"
          >
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
