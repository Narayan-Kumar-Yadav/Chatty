// File: src/components/chat/UserProfileModal.tsx
"use client";

import { X, User } from "lucide-react";

import type { AppUserProfile } from "@/lib/users";
import { cn } from "@/lib/utils";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: AppUserProfile | null;
}

export function UserProfileModal({
  isOpen,
  onClose,
  userProfile,
}: UserProfileModalProps) {
  if (!isOpen || !userProfile) return null;

  const initials = userProfile.displayName
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-[32px] p-8 text-center",
          "glass-panel shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        <button
          className="absolute right-5 top-5 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>

        <div className="mx-auto mb-5 size-28 overflow-hidden rounded-full border border-white/20">
          {userProfile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={userProfile.displayName}
              className="size-full object-cover"
              src={userProfile.photoURL}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)]">
              {initials ? (
                <span className="text-3xl font-bold text-white">
                  {initials}
                </span>
              ) : (
                <User className="size-10 text-white/60" />
              )}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white">
          {userProfile.displayName}
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--accent2)]">
          {userProfile.username}
        </p>

        {userProfile.bio ? (
          <p className="mt-6 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/70">
            {userProfile.bio}
          </p>
        ) : (
          <p className="mt-6 border-t border-white/10 pt-6 text-sm italic text-white/30">
            No bio provided.
          </p>
        )}
      </div>
    </div>
  );
}
