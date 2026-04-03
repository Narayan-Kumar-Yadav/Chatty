// File: src/components/auth/GoogleButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { signInWithGoogle } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";

type AuthMode = "login" | "signup";

interface GoogleButtonProps {
  mode: AuthMode;
}

export function GoogleButton({ mode }: GoogleButtonProps) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const setLoading = useAuthStore((state) => state.setLoading);
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialized && user) {
      router.replace("/chat");
    }
  }, [initialized, router, user]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setIsSubmitting(true);

    const result = await signInWithGoogle();

    if (result.ok) {
      toast.success(result.message);
      router.replace("/chat");
      return;
    }

    setLoading(false);
    toast.error(result.error);
    setIsSubmitting(false);
  };

  return (
    <Button
      className="border-white/10 text-white/75"
      fullWidth
      icon={<Globe className="size-4" />}
      loading={isSubmitting}
      onClick={handleGoogleSignIn}
      variant="secondary"
    >
      {mode === "login" ? "Continue with Google" : "Create account with Google"}
    </Button>
  );
}
