// File: src/hooks/usePresence.ts
import { useEffect, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firestore";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/useAuthStore";

export function usePresence(targetUserIds: string[] = []) {
  const profile = useAuthStore((state) => state.profile);
  const [realtimePresence, setRealtimePresence] = useState<
    Map<string, { isOnline: boolean; lastSeenMs?: number }>
  >(new Map());

  // 1. Manage current user's literal presence
  useEffect(() => {
    if (!profile?.id) return;

    let isUnmounted = false;

    const setPresence = async (isOnline: boolean) => {
      if (isUnmounted) return;
      try {
        const userRef = doc(db, "users", profile.id);
        await updateDoc(userRef, {
          isOnline,
          lastSeen: isOnline ? null : serverTimestamp(),
        });
      } catch (e) {
        console.error("Failed to update presence", e);
      }
    };

    const handleConnect = () => {
      socket.emit("user_online", profile.id);
      // We purposefully do NOT write isOnline: true to Firestore on every reconnect 
      // to avoid spamming writes. The Socket layer handles active presence.
    };

    const handleBeforeUnload = () => {
      setPresence(false); // Fallback: record lastSeen before tab closes
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isUnmounted = true;
      socket.off("connect", handleConnect);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setPresence(false);
    };
  }, [profile?.id]);

  // 2. Listen to real-time presence broadcasts from server
  useEffect(() => {
    // Only subscribe to the targets we care about right now
    if (targetUserIds.length > 0) {
      socket.emit("subscribe_presence", targetUserIds);
    }

    const handlePresenceSync = (syncMap: Record<string, { isOnline: boolean }>) => {
      setRealtimePresence((prev) => {
        const next = new Map(prev);
        Object.entries(syncMap).forEach(([id, state]) => {
          next.set(id, { ...next.get(id), isOnline: state.isOnline });
        });
        return next;
      });
    };

    const handlePresenceUpdate = ({
      userId,
      isOnline,
      lastSeenMs,
    }: {
      userId: string;
      isOnline: boolean;
      lastSeenMs?: number;
    }) => {
      setRealtimePresence((prev) => {
        const next = new Map(prev);
        next.set(userId, { isOnline, lastSeenMs });
        return next;
      });
    };

    socket.on("presence_sync", handlePresenceSync);
    socket.on("presence_update", handlePresenceUpdate);

    return () => {
      socket.off("presence_sync", handlePresenceSync);
      socket.off("presence_update", handlePresenceUpdate);
    };
  }, [targetUserIds.join(",")]);

  return { realtimePresence };
}
