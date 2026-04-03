// File: src/store/useAuthStore.ts
"use client";

import { create } from "zustand";
import type { User } from "firebase/auth";

import { logout as logoutFromFirebase, type LogoutResponse } from "@/lib/auth";
import type { AppUserProfile } from "@/lib/users";

interface AuthState {
  initialized: boolean;
  loading: boolean;
  logout: () => Promise<LogoutResponse>;
  profile: AppUserProfile | null;
  setLoading: (loading: boolean) => void;
  setProfile: (profile: AppUserProfile | null) => void;
  setUser: (user: User | null) => void;
  user: User | null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) =>
    set({
      initialized: true,
      user,
      // Always reset profile when the user identity changes.
      // setProfile() is called separately after syncUserProfile resolves.
      profile: null,
    }),
  setProfile: (profile) =>
    set({
      profile,
    }),
  setLoading: (loading) =>
    set({
      loading,
    }),
  logout: async () => {
    set({
      loading: true,
    });

    const result = await logoutFromFirebase();

    if (result.ok) {
      set({
        initialized: true,
        loading: false,
        user: null,
        profile: null,
      });
    } else {
      set({
        loading: false,
      });
    }

    return result;
  },
}));
