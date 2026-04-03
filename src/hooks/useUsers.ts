// File: src/hooks/useUsers.ts
"use client";

import { useCallback, useState } from "react";

import {
  getUserByEmail,
  getUserByUsername,
  type AppUserProfile,
} from "@/lib/users";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useUsers() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppUserProfile | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    setResult(null);
  }, []);

  const searchUser = useCallback(
    async (identifier: string, currentUserId: string) => {
      const normalizedIdentifier = identifier.trim();
      const normalizedCurrentUserId = currentUserId.trim();

      if (!normalizedIdentifier) {
        setError("Enter an email or username to search.");
        setResult(null);
        return null;
      }

      setError(null);
      setLoading(true);
      setResult(null);

      try {
        const matchedUser = emailPattern.test(normalizedIdentifier)
          ? await getUserByEmail(normalizedIdentifier)
          : await getUserByUsername(normalizedIdentifier);

        if (!matchedUser) {
          setError("No user matched that email or username.");
          return null;
        }

        if (matchedUser.id === normalizedCurrentUserId) {
          setError("You can't start a chat with yourself.");
          return null;
        }

        setResult(matchedUser);
        return matchedUser;
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to search users right now."
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    result,
    loading,
    error,
    searchUser,
    reset,
  };
}
