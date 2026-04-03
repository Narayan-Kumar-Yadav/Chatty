"use client";

import { useEffect, useRef } from "react";

import { Check, CheckCheck, FileText } from "lucide-react";

import type { ChatMessage } from "@/lib/chat";
import { markMessagesAsRead, markMessagesAsDelivered } from "@/lib/chat";
import { socket } from "@/lib/socket";
import { cn } from "@/lib/utils";

interface MessageListProps {
  currentUserId: string;
  hasMoreMessages?: boolean;
  loading: boolean;
  messages: ChatMessage[];
  onLoadMore?: () => void;
  roomId: string | null;
  roomName: string;
}

function formatTimestamp(createdAtMs: number) {
  if (!createdAtMs) {
    return "Just now";
  }

  return new Date(createdAtMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList({
  currentUserId,
  hasMoreMessages = false,
  loading,
  messages,
  roomId,
  roomName,
  onLoadMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!onLoadMore || !hasMoreMessages || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry && firstEntry.isIntersecting) {
          onLoadMore();
        }
      },
      { root: null, rootMargin: "20px", threshold: 1.0 }
    );

    const currentSentinel = topSentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [onLoadMore, hasMoreMessages, loading]);

  // Bottom scroll and read receipts
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });

    if (!roomId || !currentUserId) return;

    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.senderId !== currentUserId && !msg.readBy.includes(currentUserId)
      )
      .map((msg) => msg.id);

    const undeliveredMessageIds = messages
      .filter(
        (msg) =>
          msg.senderId !== currentUserId && !msg.deliveredTo.includes(currentUserId)
      )
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      markMessagesAsRead(roomId, unreadMessageIds, currentUserId).catch(
        console.error
      );
      socket.emit("message_read", { roomId, messageIds: unreadMessageIds, userId: currentUserId });
    }

    if (undeliveredMessageIds.length > 0) {
      markMessagesAsDelivered(roomId, undeliveredMessageIds, currentUserId).catch(
        console.error
      );
      socket.emit("message_delivered", { roomId, messageIds: undeliveredMessageIds, userId: currentUserId });
    }
  }, [messages, roomId, currentUserId]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--accent2)]" />
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">
            Syncing messages
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">
            {roomName}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">
            Start the conversation
          </h3>
          <p className="mt-3 text-sm leading-7 text-white/55">
            Send the first message in this room. New messages will stream in
            here instantly with Firestore listeners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="space-y-4">
        {hasMoreMessages && (
          <div
            ref={topSentinelRef}
            className="flex w-full items-center justify-center py-4"
          >
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 backdrop-blur-md">
              <div className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">
                Loading older messages...
              </span>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUserId;

          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-[24px] border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)]",
                  isCurrentUser
                    ? "border-[rgba(6,182,212,0.3)] bg-[rgba(6,182,212,0.14)]"
                    : "border-white/10 bg-white/6"
                )}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                    {message.senderLabel}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-white/30">
                    {formatTimestamp(message.createdAtMs)}
                    {isCurrentUser && (
                      <span className="ml-0.5 flex items-center">
                        {message.readBy.length > 0 ? (
                          <CheckCheck className="size-3 text-blue-400" />
                        ) : message.deliveredTo.length > 0 ? (
                          <CheckCheck className="size-3 text-white/40" />
                        ) : (
                          <Check className="size-3 text-white/40" />
                        )}
                      </span>
                    )}
                  </span>
                </div>
                {message.imageUrl && (
                  <div className="mb-2 overflow-hidden rounded-[16px]">
                    <img
                      alt="Uploaded media"
                      className="max-h-[300px] w-auto max-w-full object-cover"
                      loading="lazy"
                      src={message.imageUrl}
                    />
                  </div>
                )}
                {message.fileUrl && (
                  <a
                    className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                    href={message.fileUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">
                        {message.text || "Attached File"}
                      </p>
                      <p className="text-xs text-white/40">Click to preview/download</p>
                    </div>
                  </a>
                )}
                {message.text && !message.imageUrl && !message.fileUrl && (
                  <p className="text-sm leading-7 text-white/78">{message.text}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
