// File: src/hooks/useAuth.ts
"use client";

import { useEffect } from "react";
import { onAuthStateChanged, type Unsubscribe } from "firebase/auth";
import toast from "react-hot-toast";

import { auth } from "@/lib/firebase";
import { syncUserProfile } from "@/lib/users";
import { useAuthStore } from "@/store/useAuthStore";

let activeSubscribers = 0;
let authListener: Unsubscribe | null = null;
let authEventVersion = 0;

export function useAuth() {
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfile = useAuthStore((state) => state.setProfile);

  useEffect(() => {
    activeSubscribers += 1;

    if (!authListener) {
      setLoading(true);

      authListener = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          const eventVersion = authEventVersion + 1;
          authEventVersion = eventVersion;

          // ── Signed out ──────────────────────────────────────────────────
          if (!firebaseUser) {
            setUser(null);   // also resets profile to null (Fix 1)
            setLoading(false);
            return;
          }

          // ── Signed in — wait for syncUserProfile before exposing user ──
          // Keep loading = true so AppLayout stays on the spinner until
          // both user + profile are ready.  This prevents any render where
          // user is set but profile is null.
          setLoading(true);

          void (async () => {
            try {
              const profile = await syncUserProfile(firebaseUser);

              // Guard against stale events (e.g. rapid sign-in/sign-out)
              if (eventVersion !== authEventVersion) return;

              // Commit user + profile together so no intermediate state leaks.
              setUser(firebaseUser);   // resets profile → null (Fix 1)
              setProfile(profile);     // immediately restores it
            } catch (error) {
              if (eventVersion !== authEventVersion) return;

              // Sync failed — still surface the user so the auth guard works,
              // but show an error toast.
              setUser(firebaseUser);
              toast.error(
                error instanceof Error
                  ? error.message
                  : "We couldn't sync your Chatty profile yet."
              );
            } finally {
              if (eventVersion === authEventVersion) {
                setLoading(false);
              }
            }
          })();
        },
        () => {
          // Auth listener error
          authEventVersion += 1;
          setUser(null);   // resets profile → null
          setLoading(false);
          toast.error("We couldn't restore your session.");
        }
      );
    }

    return () => {
      activeSubscribers -= 1;

      if (activeSubscribers <= 0 && authListener) {
        authListener();
        authListener = null;
        activeSubscribers = 0;
      }
    };
  }, [setLoading, setProfile, setUser]);
}
