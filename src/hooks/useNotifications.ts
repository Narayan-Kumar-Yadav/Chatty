"use client";

import { useEffect, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, arrayUnion, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { messaging } from "@/lib/firebase";
import { db } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export function useNotifications() {
  const user = useAuthStore((state) => state.user);

  const requestPermissionAndGetToken = useCallback(async () => {
    if (!user) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const msg = await messaging();
        if (!msg) return;

        // Note: For production, you may need to pass a vapidKey to getToken
        // e.g. getToken(msg, { vapidKey: "YOUR_VAPID_KEY" })
        const currentToken = await getToken(msg);

        if (currentToken) {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(currentToken)
          });
        }
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      requestPermissionAndGetToken();
    }
  }, [user, requestPermissionAndGetToken]);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    const setupOnMessage = async () => {
      const msg = await messaging();
      if (!msg) return;

      unsubscribe = onMessage(msg, (payload) => {
        toast.success(
          `${payload.notification?.title || 'New Message'}\n${payload.notification?.body || 'You received a new message'}`,
          { duration: 5000, position: 'top-right', icon: "🔔" }
        );
      });
    };

    setupOnMessage();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);
}
