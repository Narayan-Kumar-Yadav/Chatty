// File: src/components/auth/AuthForm.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login, signUp } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";

type AuthMode = "login" | "signup";

interface AuthFormErrors {
  email?: string;
  form?: string;
  password?: string;
}

interface AuthFormProps {
  mode: AuthMode;
}

function validate(mode: AuthMode, email: string, password: string): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password =
      mode === "signup"
        ? "Use at least 6 characters for your password."
        : "Password must be at least 6 characters.";
  }

  return errors;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const setLoading = useAuthStore((state) => state.setLoading);
  const user = useAuthStore((state) => state.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialized && user) {
      router.replace("/chat");
    }
  }, [initialized, router, user]);

  const submitLabel = useMemo(
    () => (mode === "login" ? "Sign in" : "Create account"),
    [mode]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(mode, email, password);

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    const result =
      mode === "login"
        ? await login(trimmedEmail, password)
        : await signUp(trimmedEmail, password);

    if (result.ok) {
      toast.success(result.message);
      router.replace("/chat");
      return;
    }

    setLoading(false);
    setErrors({
      form: result.error,
    });
    toast.error(result.error);
    setIsSubmitting(false);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        autoFocus
        autoComplete="email"
        error={errors.email}
        label="Email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder={mode === "login" ? "captain@chatty.app" : "founder@chatty.app"}
        type="email"
        value={email}
      />
      <Input
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={errors.password}
        hint={mode === "signup" ? "Use at least 6 characters." : undefined}
        label="Password"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder={
          mode === "login" ? "Enter your password" : "Choose a strong password"
        }
        type="password"
        value={password}
      />

      {errors.form ? (
        <p className="text-sm leading-6 text-[var(--accent2)]">{errors.form}</p>
      ) : null}

      <Button
        fullWidth
        icon={<ArrowRight className="size-4" />}
        loading={isSubmitting}
        size="lg"
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
