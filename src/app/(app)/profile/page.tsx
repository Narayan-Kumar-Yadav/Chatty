// File: src/app/(app)/profile/page.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const profileProps = useProfile();
  const { loadingProfile, profile } = profileProps;

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          className="mb-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/45 transition hover:text-white/80"
          href="/chat"
        >
          <ArrowLeft className="size-3.5" />
          Back to chat
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.16)]">
            <UserCircle className="size-6 text-[var(--accent3)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Your Profile
            </h1>
          </div>
        </div>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {loadingProfile && (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="glass-panel animate-pulse rounded-[28px] p-8"
            >
              <div className="mb-6 h-4 w-32 rounded-full bg-white/10" />
              <div className="space-y-4">
                <div className="h-12 w-full rounded-2xl bg-white/8" />
                <div className="h-12 w-full rounded-2xl bg-white/8" />
                <div className="h-28 w-full rounded-2xl bg-white/8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Profile not found ────────────────────────────────────────── */}
      {!loadingProfile && !profile && (
        <div className="glass-panel rounded-[28px] px-8 py-10 text-center">
          <UserCircle className="mx-auto mb-4 size-12 text-white/20" />
          <h2 className="text-lg font-semibold text-white">
            Profile not found
          </h2>
          <p className="mt-2 text-sm text-white/50">
            We couldn&apos;t load your profile. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* ── Loaded ───────────────────────────────────────────────────── */}
      {!loadingProfile && profile && <ProfileForm {...profileProps} />}
    </div>
  );
}
