// File: src/components/chat/Sidebar.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { MessageSquare, Plus, Star, Users } from "lucide-react";

import { NewChatModal } from "@/components/chat/NewChatModal";
import { Button } from "@/components/ui/Button";
import { createOrGetRoom, type ChatRoom } from "@/lib/chat";
import type { AppUserProfile } from "@/lib/users";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface SidebarProps {
  currentRoomId: string | null;
  currentUserId: string | null;
  loading: boolean;
  onSelectRoom: (room: ChatRoom) => void;
  rooms: ChatRoom[];
}

function formatRoomTime(ms: number): string {
  if (!ms) {
    return "Just now";
  }

  const date = new Date(ms);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function Sidebar({
  currentRoomId,
  currentUserId,
  loading,
  onSelectRoom,
  rooms,
}: SidebarProps) {
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const profile = useAuthStore((state) => state.profile);

  const visibleRooms = rooms
    .filter((room) => {
      if (
        room.otherUser &&
        profile?.blockedUsers?.includes(room.otherUser.id)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aFav = profile?.favoriteRooms?.includes(a.id) ? 1 : 0;
      const bFav = profile?.favoriteRooms?.includes(b.id) ? 1 : 0;

      if (aFav !== bFav) {
        return bFav - aFav;
      }

      return b.lastMessageAtMs - a.lastMessageAtMs;
    });

  const handleStartChat = async (targetUser: AppUserProfile) => {
    if (!currentUserId) {
      toast.error("You need to be signed in to start a chat.");
      return;
    }

    setIsCreatingRoom(true);

    try {
      const room = await createOrGetRoom(currentUserId, targetUser.id);

      onSelectRoom(room);
      setIsModalOpen(false);
      toast.success(`Chat ready with ${targetUser.displayName}.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start that chat right now."
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <>
      <aside className="glass-panel flex min-h-[560px] flex-col rounded-[32px] p-5">
        <div className="mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                Rooms
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Your spaces
              </h2>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.16)]">
              <Users className="size-5 text-[var(--accent3)]" />
            </div>
          </div>

          <div className="mt-5">
            <Button
              fullWidth
              icon={<Plus className="size-4" />}
              onClick={() => setIsModalOpen(true)}
              size="sm"
              variant="secondary"
            >
              New Chat
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {visibleRooms.map((room) => {
            const isActive = room.id === currentRoomId;

            return (
              <button
                key={room.id}
                className={cn(
                  "w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8",
                  isActive &&
                    "border-[rgba(6,182,212,0.45)] bg-[rgba(6,182,212,0.12)] shadow-[0_0_24px_rgba(6,182,212,0.12)]"
                )}
                onClick={() => onSelectRoom(room)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {profile?.favoriteRooms?.includes(room.id) ? (
                        <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
                      ) : (
                        <MessageSquare className="size-4 shrink-0 text-[var(--accent2)]" />
                      )}
                      <h3 className="truncate text-sm font-semibold text-white">
                        {room.name}
                      </h3>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-white/45">
                      {room.lastMessage || (
                        <span className="italic text-white/25">No messages yet</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-white/35">
                    {formatRoomTime(room.lastMessageAtMs)}
                  </span>
                </div>
              </button>
            );
          })}

          {!loading && visibleRooms.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6">
              <p className="text-sm leading-7 text-white/55">
                No direct chats yet. Start one with the New Chat button.
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      <NewChatModal
        currentUserId={currentUserId}
        isOpen={isModalOpen}
        isSubmitting={isCreatingRoom}
        onClose={() => {
          if (!isCreatingRoom) {
            setIsModalOpen(false);
          }
        }}
        onStartChat={handleStartChat}
      />
    </>
  );
}
