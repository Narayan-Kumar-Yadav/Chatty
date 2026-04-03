"use client";

import { create } from "zustand";

import type { ChatMessage, ChatRoom } from "@/lib/chat";

interface ChatState {
  currentRoom: ChatRoom | null;
  loading: boolean;
  messages: ChatMessage[];
  rooms: ChatRoom[];
  setCurrentRoom: (room: ChatRoom | null) => void;
  setLoading: (loading: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setRooms: (rooms: ChatRoom[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  currentRoom: null,
  messages: [],
  loading: true,
  setRooms: (rooms) => {
    set({
      rooms,
    });
  },
  setCurrentRoom: (currentRoom) => {
    set({
      currentRoom,
    });
  },
  setMessages: (messages) => {
    set({
      messages,
    });
  },
  setLoading: (loading) => {
    set({
      loading,
    });
  },
}));
