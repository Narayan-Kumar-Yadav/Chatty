// File: src/components/profile/AvatarUpload.tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UploadProgress } from "@/lib/storage";

interface AvatarUploadProps {
  currentPhotoURL: string;
  displayName: string;
  onFileSelected: (file: File) => Promise<void>;
  uploadProgress: UploadProgress | null;
}

export function AvatarUpload({
  currentPhotoURL,
  displayName,
  onFileSelected,
  uploadProgress,
}: AvatarUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Store the current object URL in a ref so we can always revoke it,
  // even if the component unmounts before the upload finishes.
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ---------------------------------------------------------------------------
  // Cleanup: revoke any live object URL when the component unmounts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const isUploading = uploadProgress !== null;
  const percent = uploadProgress?.percent ?? 0;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function revokeCurrentObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleFileChange(file: File | null | undefined) {
    if (!file) return;

    // Revoke any previous preview URL before creating a new one
    revokeCurrentObjectUrl();

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);

    void onFileSelected(file)
      .catch(() => {
        // Upload failed — clear the stale blob preview so the component falls
        // back to the real photoURL (or initials). Memory cleanup happens in
        // the finally block below.
        setPreview(null);
      })
      .finally(() => {
        // Release the blob from memory.
        // On success we do NOT clear preview here — the parent will update
        // currentPhotoURL (the real CDN URL) which naturally replaces the
        // blob once the img src prop changes.
        revokeCurrentObjectUrl();
      });
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange(event.target.files?.[0]);
    // Reset so the same file can be re-selected
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];

    if (file?.type.startsWith("image/")) {
      handleFileChange(file);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const avatarSrc = preview ?? currentPhotoURL;
  const initials = displayName
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar circle — also the drop target */}
      <button
        aria-label="Upload profile picture"
        className={cn(
          "group relative size-28 shrink-0 overflow-hidden rounded-full",
          "border-2 border-white/20 transition",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent3)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "hover:border-[var(--accent3)]",
          dragOver && "border-[var(--accent3)] scale-105"
        )}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        type="button"
      >
        {/* Avatar image or initials fallback */}
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={displayName}
            className="size-full object-cover"
            src={avatarSrc}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)]">
            {initials ? (
              <span className="text-2xl font-bold text-white">{initials}</span>
            ) : (
              <User className="size-10 text-white/60" />
            )}
          </div>
        )}

        {/* Upload overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-black/55 transition",
            isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {isUploading ? (
            <>
              <div className="relative size-8">
                {/* Circular progress ring */}
                <svg
                  className="-rotate-90"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="text-white/20"
                    cx="16"
                    cy="16"
                    fill="none"
                    r="13"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <circle
                    className="text-[var(--accent3)] transition-all duration-200"
                    cx="16"
                    cy="16"
                    fill="none"
                    r="13"
                    stroke="currentColor"
                    strokeDasharray={`${2 * Math.PI * 13}`}
                    strokeDashoffset={`${2 * Math.PI * 13 * (1 - percent / 100)}`}
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                </svg>
              </div>
              <span className="mt-1 text-[10px] font-semibold text-white">
                {percent}%
              </span>
            </>
          ) : (
            <>
              <Camera className="size-6 text-white" />
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                Change
              </span>
            </>
          )}
        </div>
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="sr-only"
        id={inputId}
        onChange={handleInputChange}
        type="file"
      />

      {/* Helper text */}
      <p className="text-center text-[11px] uppercase tracking-[0.22em] text-white/40">
        {isUploading ? "Uploading…" : "Click or drag to change photo"}
      </p>
    </div>
  );
}
