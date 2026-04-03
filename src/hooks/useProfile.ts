// File: src/hooks/useProfile.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  checkUsernameAvailability,
  sendPasswordReset,
  updateUserProfile,
  updateUsername,
  type AppUserProfile,
} from "@/lib/users";
import { uploadAvatar, type UploadProgress } from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileFormState {
  bio: string;
  displayName: string;
  username: string;
  photoURL: string;
}

export interface UsernameStatus {
  checking: boolean;
  available: boolean | null; // null = not yet checked / same as current
  message: string;
}

export interface UseProfileReturn {
  // Data
  profile: AppUserProfile | null;
  formState: ProfileFormState;
  // Loading flags
  loadingProfile: boolean;
  saving: boolean;
  uploadProgress: UploadProgress | null;
  // Username availability
  usernameStatus: UsernameStatus;
  // Form controls
  setField: <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => void;
  // Actions
  handleSave: () => Promise<void>;
  handleAvatarChange: (file: File) => Promise<void>;
  handlePasswordReset: () => Promise<void>;
  // Derived
  isDirty: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USERNAME_DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfile(): UseProfileReturn {
  const user = useAuthStore((state) => state.user);
  // Zustand is the single source of truth for profile data.
  // Local state only holds the editable form fields.
  const profile = useAuthStore((state) => state.profile);
  const setStoreProfile = useAuthStore((state) => state.setProfile);

  // loadingProfile reflects whether we are still *waiting* for the Zustand
  // profile to be populated (set by useAuth after syncUserProfile).
  // Once profile is non-null we flip it off.
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );

  const [formState, setFormState] = useState<ProfileFormState>({
    bio: "",
    displayName: "",
    username: "",
    photoURL: "",
  });

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    checking: false,
    available: null,
    message: "",
  });

  // Tracks the username that the form was *last seeded from*, so we know
  // whether the user has actually changed it.
  const originalUsernameRef = useRef<string>("");
  // Whether the form has been seeded from the profile at least once.
  const seededRef = useRef(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // -------------------------------------------------------------------------
  // Seed form from Zustand profile (replaces the old Firestore fetch)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!profile) {
      // Still loading — keep spinner
      if (user) {
        setLoadingProfile(true);
      } else {
        setLoadingProfile(false);
      }
      return;
    }

    // Profile is ready — hide spinner
    setLoadingProfile(false);

    // Only seed the form once (on first load), not on every Zustand update,
    // so in-progress edits aren't wiped out by background profile mutations.
    if (seededRef.current) return;
    seededRef.current = true;

    originalUsernameRef.current = profile.username;
    setFormState({
      bio: profile.bio,
      displayName: profile.displayName,
      username: profile.username,
      photoURL: profile.photoURL,
    });
  }, [profile, user]);

  // -------------------------------------------------------------------------
  // Debounced username availability check
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
    }

    // Normalize: strip leading @, lowercase, trim
    const rawKey = formState.username.trim().toLowerCase().replace(/^@/, "");
    const original = originalUsernameRef.current
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    // Same as original → no check needed
    if (rawKey === original) {
      setUsernameStatus({ checking: false, available: null, message: "" });
      return;
    }

    // Instant validation feedback (no network call needed)
    if (rawKey.length > 0 && rawKey.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "At least 3 characters required.",
      });
      return;
    }

    if (rawKey.length > 20) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Max 20 characters.",
      });
      return;
    }

    if (rawKey.length > 0 && !/^[a-z0-9_]+$/.test(rawKey)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Letters, numbers, and underscores only.",
      });
      return;
    }

    if (!rawKey) {
      setUsernameStatus({ checking: false, available: null, message: "" });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: "" });

    // Pass the already-normalized key to the availability check
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(rawKey, user?.uid);

        setUsernameStatus({
          checking: false,
          available,
          message: available ? "Username is available!" : "Username is taken.",
        });
      } catch {
        setUsernameStatus({
          checking: false,
          available: null,
          message: "Could not check availability.",
        });
      }
    }, USERNAME_DEBOUNCE_MS);

    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }
    };
  }, [formState.username, user?.uid]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const setField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setFormState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const isDirty =
    profile !== null &&
    (formState.displayName !== profile.displayName ||
      formState.username !== profile.username ||
      formState.bio !== profile.bio ||
      formState.photoURL !== profile.photoURL);

  // -------------------------------------------------------------------------
  // Save profile
  // -------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!user || !profile) return;

    if (!formState.displayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }

    if (usernameStatus.checking) {
      toast.error("Please wait while we check username availability.");
      return;
    }

    const usernameChanged = formState.username !== profile.username;

    if (usernameChanged && usernameStatus.available === false) {
      toast.error("Please choose an available username before saving.");
      return;
    }

    setSaving(true);

    try {
      // 1. Persist displayName / bio / photoURL
      await updateUserProfile(user.uid, {
        displayName: formState.displayName,
        bio: formState.bio,
        photoURL: formState.photoURL,
      });

      // 2. Atomically swap username if changed
      let finalUsername = profile.username;

      if (usernameChanged) {
        finalUsername = await updateUsername(
          user.uid,
          formState.username,
          profile.username
        );
      }

      // 3. Push the merged update into Zustand — no separate local state
      const updated: AppUserProfile = {
        ...profile,
        displayName: formState.displayName.trim(),
        bio: formState.bio.trim(),
        username: finalUsername,
      };

      setStoreProfile(updated);
      originalUsernameRef.current = finalUsername;
      setUsernameStatus({ checking: false, available: null, message: "" });

      toast.success("Profile saved!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }, [user, profile, formState, usernameStatus.available, usernameStatus.checking, setStoreProfile]);

  // -------------------------------------------------------------------------
  // Avatar upload
  // -------------------------------------------------------------------------
  const handleAvatarChange = useCallback(
    async (file: File) => {
      if (!user) return;

      setUploadProgress({ bytesTransferred: 0, totalBytes: 1, percent: 0 });

      try {
        const downloadURL = await uploadAvatar(user.uid, file, (progress) => {
          setUploadProgress(progress);
        });

        // Persist photoURL to Firestore
        await updateUserProfile(user.uid, { photoURL: downloadURL });

        // Update form state so the input reflects the new URL
        setFormState((prev) => ({ ...prev, photoURL: downloadURL }));

        // Push to Zustand — navbar avatar updates immediately
        if (profile) {
          setStoreProfile({ ...profile, photoURL: downloadURL });
        }

        toast.success("Avatar updated!");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload avatar."
        );
      } finally {
        setUploadProgress(null);
      }
    },
    [user, profile, setStoreProfile]
  );

  // -------------------------------------------------------------------------
  // Password reset
  // -------------------------------------------------------------------------
  const handlePasswordReset = useCallback(async () => {
    if (!user?.email) {
      toast.error("No email address found for this account.");
      return;
    }

    try {
      await sendPasswordReset(user.email);
      toast.success(`Password reset email sent to ${user.email}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send password reset email."
      );
    }
  }, [user?.email]);

  return {
    profile,
    formState,
    loadingProfile,
    saving,
    uploadProgress,
    usernameStatus,
    setField,
    handleSave,
    handleAvatarChange,
    handlePasswordReset,
    isDirty,
  };
}
