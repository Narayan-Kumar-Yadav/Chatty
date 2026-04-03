// File: src/hooks/useTyping.ts
import { useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";

export function useTyping(roomId: string | null, currentUserId: string | null) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to typing events
  useEffect(() => {
    if (!roomId) {
      setIsTyping(false);
      return;
    }

    // Join the room channel to receive room-specific typing broadcasts
    socket.emit("join_room", roomId);

    const handleStart = ({
      roomId: eventRoom,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      if (eventRoom === roomId && userId !== currentUserId) {
        setIsTyping(true);
      }
    };

    const handleStop = ({
      roomId: eventRoom,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      if (eventRoom === roomId && userId !== currentUserId) {
        setIsTyping(false);
      }
    };

    socket.on("typing_start", handleStart);
    socket.on("typing_stop", handleStop);

    return () => {
      socket.off("typing_start", handleStart);
      socket.off("typing_stop", handleStop);
      socket.emit("leave_room", roomId);
      setIsTyping(false);
    };
  }, [roomId, currentUserId]);

  // Method called locally when user presses keystrokes
  const handleType = () => {
    if (!roomId || !currentUserId) return;

    socket.emit("typing_start", { roomId, userId: currentUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", { roomId, userId: currentUserId });
      typingTimeoutRef.current = null;
    }, 500);
  };

  return { isTyping, handleType };
}
