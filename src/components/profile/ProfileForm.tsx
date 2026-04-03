// File: src/components/profile/ProfileForm.tsx
"use client";

import {
  AtSign,
  CheckCircle,
  Info,
  KeyRound,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";

import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { UseProfileReturn } from "@/hooks/useProfile";

export type ProfileFormProps = UseProfileReturn;

// ---------------------------------------------------------------------------
// Textarea UI primitive (matches Input styling)
// ---------------------------------------------------------------------------

interface TextareaProps {
  id?: string;
  label?: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
  hint?: string;
}

function Textarea({
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
  hint,
}: TextareaProps) {
  const remaining = maxLength !== undefined ? maxLength - value.length : null;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label
            className="text-xs uppercase tracking-[0.28em] text-white/70"
            htmlFor={id}
          >
            {label}
          </label>
          {remaining !== null && (
            <span
              className={cn(
                "text-[11px] tabular-nums",
                remaining < 20 ? "text-[var(--accent2)]" : "text-white/35"
              )}
            >
              {remaining} left
            </span>
          )}
        </div>
      )}
      <textarea
        className="glass-panel glow-ring h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[var(--accent3)] focus:shadow-[0_0_0_1px_rgba(6,182,212,0.35),0_0_24px_rgba(6,182,212,0.18)] focus:outline-none"
        id={id}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {hint && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
          {hint}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Username availability indicator
// ---------------------------------------------------------------------------

interface UsernameIndicatorProps {
  checking: boolean;
  available: boolean | null;
  message: string;
}

function UsernameIndicator({
  available,
  checking,
  message,
}: UsernameIndicatorProps) {
  if (checking) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-white/50">
        <Loader2 className="size-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (available === null || !message) return null;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        available ? "text-emerald-400" : "text-[var(--accent2)]"
      )}
    >
      {available ? (
        <CheckCircle className="size-3" />
      ) : (
        <XCircle className="size-3" />
      )}
      {message}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SectionCard — reusable glass card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="glass-panel rounded-[28px] p-6 sm:p-8">
      <div className="mb-6 border-b border-white/10 pb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-white/50">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ProfileForm
// ---------------------------------------------------------------------------

export function ProfileForm({
  formState,
  handleAvatarChange,
  handlePasswordReset,
  handleSave,
  isDirty,
  profile,
  saving,
  setField,
  uploadProgress,
  usernameStatus,
}: ProfileFormProps) {
  if (!profile) return null;

  const isBlockedByUsername =
    formState.username !== profile.username &&
    (usernameStatus.checking || usernameStatus.available === false);

  return (
    <div className="space-y-6">
      {/* ── Avatar ─────────────────────────────────────────────────────── */}
      <SectionCard
        title="Profile Picture"
        description="Upload a photo that represents you."
      >
        <AvatarUpload
          currentPhotoURL={formState.photoURL}
          displayName={formState.displayName}
          onFileSelected={handleAvatarChange}
          uploadProgress={uploadProgress}
        />
      </SectionCard>

      {/* ── Identity ───────────────────────────────────────────────────── */}
      <SectionCard
        title="Identity"
        description="How others see you in Chatty."
      >
        <Input
          autoComplete="name"
          id="displayName"
          label="Display Name"
          maxLength={50}
          onChange={(e) => setField("displayName", e.target.value)}
          placeholder="Your name"
          value={formState.displayName}
        />

        {/* Username field with availability indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              className="text-xs uppercase tracking-[0.28em] text-white/70"
              htmlFor="username"
            >
              Username
            </label>
            <UsernameIndicator
              available={usernameStatus.available}
              checking={usernameStatus.checking}
              message={usernameStatus.message}
            />
          </div>
          <div className="relative">
            <AtSign className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              className={cn(
                "glass-panel glow-ring h-12 w-full rounded-2xl border border-white/10 bg-white/5 py-0 pl-10 pr-4 text-sm text-white placeholder:text-white/35",
                "focus:border-[var(--accent3)] focus:shadow-[0_0_0_1px_rgba(6,182,212,0.35),0_0_24px_rgba(6,182,212,0.18)] focus:outline-none",
                usernameStatus.available === false &&
                "border-[rgba(236,72,153,0.5)]",
                usernameStatus.available === true && "border-emerald-500/50"
              )}
              id="username"
              maxLength={20}
              onChange={(e) =>
                setField("username", e.target.value.toLowerCase())
              }
              placeholder="your_username"
              spellCheck={false}
              value={formState.username}
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/40">
            <Info className="size-3 shrink-0" />
            3–20 chars · letters, numbers, underscores only
          </p>
        </div>

        <Textarea
          hint="Share a short bio (150 chars max)"
          id="bio"
          label="Bio"
          maxLength={150}
          onChange={(value) => setField("bio", value)}
          placeholder="Tell people a little about yourself…"
          value={formState.bio}
        />
      </SectionCard>

      {/* ── Save ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/40">
          {isDirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <Button
          disabled={!isDirty || isBlockedByUsername}
          icon={<Save className="size-4" />}
          loading={saving}
          onClick={handleSave}
          size="lg"
          variant="primary"
        >
          Save changes
        </Button>
      </div>

      {/* ── Security ───────────────────────────────────────────────────── */}
      <SectionCard
        title="Security"
        description="Manage your account password."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">Password Reset</p>
            <p className="mt-0.5 text-xs text-white/45">
              We&apos;ll send a reset link to your email address.
            </p>
          </div>
          <Button
            icon={<KeyRound className="size-4" />}
            onClick={handlePasswordReset}
            size="sm"
            variant="secondary"
          >
            Send reset email
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
