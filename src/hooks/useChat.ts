// File: src/hooks/useChat.ts
"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import type { QueryDocumentSnapshot } from "firebase/firestore";

import { subscribeToMessages, subscribeToUserRooms, fetchOlderMessages, type ChatMessage } from "@/lib/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";

export function useChat() {
  const user = useAuthStore((state) => state.user);
  const currentRoom = useChatStore((state) => state.currentRoom);
  const loading = useChatStore((state) => state.loading);
  const messages = useChatStore((state) => state.messages);
  const rooms = useChatStore((state) => state.rooms);
  const setCurrentRoom = useChatStore((state) => state.setCurrentRoom);
  const setLoading = useChatStore((state) => state.setLoading);
  const setMessages = useChatStore((state) => state.setMessages);
  const setRooms = useChatStore((state) => state.setRooms);

  const [lastVisibleMessage, setLastVisibleMessage] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const isFetchingMore = useRef(false);

  const loadMoreMessages = useCallback(async () => {
    const currentRoomId = currentRoom?.id;
    if (!currentRoomId || !hasMoreMessages || isFetchingMore.current || !lastVisibleMessage) return;

    isFetchingMore.current = true;

    try {
      const { messages: olderMessages, lastDoc } = await fetchOlderMessages(currentRoomId, lastVisibleMessage, 50);

      // Guard checking if room changed while fetching
      if (useChatStore.getState().currentRoom?.id !== currentRoomId) {
        return;
      }

      if (olderMessages.length < 50) {
        setHasMoreMessages(false);
      }

      if (olderMessages.length > 0 && lastDoc) {
        setLastVisibleMessage(lastDoc);
      }

      // Merge and deduplicate
      const prev = useChatStore.getState().messages;
      const map = new Map<string, ChatMessage>();
      prev.forEach((m) => map.set(m.id, m));
      olderMessages.forEach((m) => map.set(m.id, m));
      const getSortTime = (m: ChatMessage) => m.createdAtMs || Date.now() + 100000;
      setMessages(Array.from(map.values()).sort((a, b) => getSortTime(a) - getSortTime(b)));

    } catch (error) {
      if (useChatStore.getState().currentRoom?.id !== currentRoomId) {
        return;
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load older messages."
      );
    } finally {
      isFetchingMore.current = false;
    }
  }, [currentRoom?.id, hasMoreMessages, lastVisibleMessage, setMessages]);

  // -------------------------------------------------------------------------
  // Subscribe to the user's room list
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      setRooms([]);
      setCurrentRoom(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    return subscribeToUserRooms(
      user.uid,
      (nextRooms) => {
        setRooms(nextRooms);

        const storedRoom = useChatStore.getState().currentRoom;
        const nextCurrentRoom =
          nextRooms.find((room) => room.id === storedRoom?.id) ??
          nextRooms[0] ??
          null;

        setCurrentRoom(nextCurrentRoom);

        if (!nextCurrentRoom) {
          setMessages([]);
        }

        setLoading(false);
      },
      (error: Error) => {
        setRooms([]);
        setCurrentRoom(null);
        setMessages([]);
        setLoading(false);
        toast.error(error.message || "Unable to load your rooms right now.");
      }
    );
  }, [setCurrentRoom, setLoading, setMessages, setRooms, user]);

  // -------------------------------------------------------------------------
  // Subscribe to messages in the active room (latest 50, oldest→newest)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const currentRoomId = currentRoom?.id ?? null;

    if (!currentRoomId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setLastVisibleMessage(null);
    setHasMoreMessages(true);
    isFetchingMore.current = false;

    const unsub = subscribeToMessages(
      currentRoomId,
      50,
      (nextMessages: ChatMessage[], lastDoc: QueryDocumentSnapshot | null) => {
        // Guard: ignore stale callbacks if the room changed mid-flight
        if (useChatStore.getState().currentRoom?.id !== currentRoomId) {
          return;
        }

        if (nextMessages.length < 50) {
          setHasMoreMessages(false);
        }

        setLastVisibleMessage((prev) => {
          if (!prev && lastDoc) return lastDoc;
          return prev;
        });

        const prev = useChatStore.getState().messages;
        const map = new Map<string, ChatMessage>();
        if (prev.length > 0) {
          prev.forEach((m) => map.set(m.id, m));
        }
        nextMessages.forEach((m) => map.set(m.id, m));
        const getSortTime = (m: ChatMessage) => m.createdAtMs || Date.now() + 100000;
        setMessages(Array.from(map.values()).sort((a, b) => getSortTime(a) - getSortTime(b)));
        
        setLoading(false);
      },
      (error: Error) => {
        if (useChatStore.getState().currentRoom?.id !== currentRoomId) {
          return;
        }

        setLoading(false);
        toast.error(error.message || "Unable to sync messages right now.");
      }
    );
    
    return () => unsub();
  }, [currentRoom?.id, setLoading, setMessages]);

  return {
    currentRoom,
    hasMoreMessages,
    loading,
    messages,
    rooms,
    setCurrentRoom,
    user,
    loadMoreMessages,
  };
}
