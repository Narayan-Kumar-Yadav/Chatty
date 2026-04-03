// File: src/app/(app)/layout.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import toast from "react-hot-toast";

import { LogOut, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const loading = useAuthStore((state) => state.loading);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  // Profile comes directly from Zustand — no extra Firestore read needed
  const profile = useAuthStore((state) => state.profile);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [initialized, loading, router, user]);

  const handleLogout = async () => {
    setIsSigningOut(true);

    const result = await logout();

    if (result.ok) {
      toast.success(result.message);
      router.replace("/login");
    } else {
      toast.error(result.error);
    }

    setIsSigningOut(false);
  };

  if (!initialized || loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-8 lg:px-10">
          <div className="glass-panel rounded-[28px] px-8 py-6 text-center">
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-white/25 border-t-[var(--accent3)]" />
            <p className="text-xs uppercase tracking-[0.28em] text-white/50">
              Restoring session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.displayName ?? "";
  const photoURL = profile?.photoURL ?? "";

  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="glass-panel rounded-[28px] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Brand */}
            <Link
              href="/chat"
              className="group flex items-center gap-3 transition"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)]">
                <span className="text-sm font-bold text-white">C</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-none text-white group-hover:text-white/90">
                  Chatty
                </h1>
                <p className="mt-0.5 text-[11px] leading-none text-white/40">
                  {user.email ?? "User"}
                </p>
              </div>
            </Link>

            {/* Nav actions */}
            <div className="flex items-center gap-3">
              {/* Profile avatar button */}
              <Link
                aria-label="Your profile"
                className="group relative size-9 overflow-hidden rounded-full border border-white/20 transition hover:border-[var(--accent3)] hover:shadow-[0_0_16px_rgba(6,182,212,0.25)]"
                href="/profile"
              >
                {photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={displayName || "Profile photo"}
                    className="size-full object-cover"
                    src={photoURL}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)]">
                    {initials ? (
                      <span className="text-xs font-bold text-white">
                        {initials}
                      </span>
                    ) : (
                      <UserCircle className="size-5 text-white/70" />
                    )}
                  </div>
                )}
                {/* Tooltip */}
                <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  Profile
                </span>
              </Link>

              {/* Sign out */}
              <Button
                icon={<LogOut className="size-4" />}
                loading={isSigningOut}
                onClick={handleLogout}
                size="sm"
                variant="secondary"
              >
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
