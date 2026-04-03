// File: src/components/chat/ChatHeader.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import {
  Ban,
  Lock,
  MessageSquareX,
  MoreVertical,
  Star,
  Users,
} from "lucide-react";

import { UserProfileModal } from "@/components/chat/UserProfileModal";
import { usePresence } from "@/hooks/usePresence";
import { useTyping } from "@/hooks/useTyping";
import { type ChatRoom, clearChat } from "@/lib/chat";
import { blockUser, unblockUser, toggleFavorite, type AppUserProfile } from "@/lib/users";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  currentRoom: ChatRoom | null;
  currentUser: AppUserProfile | null;
}

export function ChatHeader({ currentRoom, currentUser }: ChatHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time hooks
  const { realtimePresence } = usePresence(
    currentRoom?.otherUser?.id ? [currentRoom.otherUser.id] : []
  );
  const { isTyping } = useTyping(
    currentRoom?.id ?? null,
    currentUser?.id ?? null
  );

  if (!currentRoom || !currentUser) {
    return (
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <h2 className="text-xl font-semibold text-white/40">Select a room</h2>
      </div>
    );
  }

  const otherUser = currentRoom.otherUser;
  const isFavorite = currentUser.favoriteRooms?.includes(currentRoom.id) ?? false;
  const isBlocked =
    otherUser && (currentUser.blockedUsers?.includes(otherUser.id) ?? false);

  // Presence calculation
  const presence = otherUser ? realtimePresence.get(otherUser.id) : null;
  const isOnline = presence?.isOnline ?? otherUser?.isOnline ?? false;
  const lastSeenMs = presence?.lastSeenMs ?? otherUser?.lastSeenMs;

  const handleToggleFavorite = async () => {
    setIsProcessing(true);
    try {
      await toggleFavorite(currentUser.id, currentRoom.id, isFavorite);
      toast.success(
        isFavorite ? "Removed from favorites." : "Added to favorites."
      );
    } catch {
      toast.error("Could not update favorites.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!otherUser) return;
    setIsProcessing(true);
    setIsMenuOpen(false);
    try {
      if (isBlocked) {
        await unblockUser(currentUser.id, otherUser.id);
        toast.success(`You unblocked ${otherUser.displayName}.`);
      } else {
        await blockUser(currentUser.id, otherUser.id);
        toast.success(`You blocked ${otherUser.displayName}.`);
      }
    } catch {
      toast.error("Could not update block status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to delete all messages in this chat? This cannot be undone.")) {
      setIsMenuOpen(false);
      return;
    }

    setIsProcessing(true);
    setIsMenuOpen(false);
    try {
      await clearChat(currentRoom.id);
      toast.success("Chat cleared.");
    } catch {
      toast.error("Could not clear chat.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
        {/* Left side: Avatar + Info */}
        <div className="flex items-center gap-4">
          {/* Avatar (Clickable if direct message) */}
          <button
            className={cn(
              "group relative size-12 shrink-0 overflow-hidden rounded-full border border-white/10 transition",
              otherUser && "hover:border-[var(--accent3)] hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            )}
            disabled={!otherUser}
            onClick={() => setIsProfileOpen(true)}
            type="button"
          >
            {otherUser?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={otherUser.displayName}
                className="size-full object-cover"
                src={otherUser.photoURL}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-[var(--accent)] via-[var(--accent2)] to-[var(--accent3)]">
                {currentRoom.isGroup ? (
                  <Users className="size-5 text-white/80" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {otherUser?.displayName?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
            )}
            {otherUser && (
              <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100" />
            )}
          </button>

          {/* User / Room Info */}
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={cn(
                  "text-lg font-semibold text-white",
                  otherUser && "cursor-pointer transition hover:text-[var(--accent2)]"
                )}
                onClick={() => {
                  if (otherUser) setIsProfileOpen(true);
                }}
              >
                {currentRoom.name}
              </h2>
              {isBlocked && (
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                  Blocked
                </span>
              )}
            </div>
            {otherUser && (
              <p className="flex items-center text-xs font-medium text-[var(--accent3)]">
                {otherUser.username}
                {isOnline && !isTyping && (
                  <span className="ml-2 inline-flex items-center gap-1.5 opacity-80">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400">Online</span>
                  </span>
                )}
                {!isOnline && lastSeenMs && !isTyping && (
                  <span className="ml-2 text-[10px] text-white/30">
                    • Last seen {new Date(lastSeenMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {isTyping && (
                  <span className="ml-2 animate-pulse text-[11px] italic text-[var(--accent)]">
                    typing...
                  </span>
                )}
              </p>
            )}
            {!otherUser && (
              <p className="text-xs text-white/40">Group Chat</p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-3">
          {/* E2EE Indicator */}
          <div
            className="group relative flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          >
            <Lock className="size-3 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest text-emerald-400/90">
              End-to-end encrypted
            </span>
            {/* Tooltip */}
            <div className="pointer-events-none absolute -bottom-8 left-1/2 w-48 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-3 py-1.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
              Messages are secured with end-to-end encryption.
            </div>
          </div>

          {/* Favorite Toggle */}
          <button
            className={cn(
              "rounded-full p-2 transition",
              isFavorite
                ? "bg-amber-500/10 text-amber-400"
                : "text-white/40 hover:bg-white/10 hover:text-white"
            )}
            disabled={isProcessing}
            onClick={handleToggleFavorite}
            title={isFavorite ? "Remove favorite" : "Add favorite"}
            type="button"
          >
            <Star className={cn("size-4", isFavorite && "fill-amber-400")} />
          </button>

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white focus:outline-none"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              type="button"
            >
              <MoreVertical className="size-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-1 shadow-2xl backdrop-blur-xl">
                {otherUser && (
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--accent2)] transition hover:bg-white/10"
                    disabled={isProcessing}
                    onClick={handleToggleBlock}
                    type="button"
                  >
                    <Ban className="size-4" />
                    {isBlocked ? "Unblock user" : "Block user"}
                  </button>
                )}
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
                  disabled={isProcessing}
                  onClick={handleClearChat}
                  type="button"
                >
                  <MessageSquareX className="size-4" />
                  Clear chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={otherUser ?? null}
      />

      {/* Close menu when clicking outside (simple trick using an overlay) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}
