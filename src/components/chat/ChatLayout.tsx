// File: src/components/chat/ChatLayout.tsx
"use client";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/chat/Sidebar";
import { useChat } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/useAuthStore";

export function ChatLayout() {
  const { currentRoom, loading, messages, rooms, setCurrentRoom, user, loadMoreMessages, hasMoreMessages } = useChat();
  const profile = useAuthStore((state) => state.profile);

  // Setup foreground push notifications
  useNotifications();

  const isBlocked = Boolean(
    profile &&
    currentRoom?.otherUser &&
    profile.blockedUsers?.includes(currentRoom.otherUser.id)
  );

  return (
    <section className="mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
      <Sidebar
        currentRoomId={currentRoom?.id ?? null}
        currentUserId={user?.uid ?? null}
        loading={loading}
        onSelectRoom={setCurrentRoom}
        rooms={rooms}
      />

      <div className="glass-panel flex min-h-[560px] flex-col rounded-[32px]">
        <ChatHeader currentRoom={currentRoom} currentUser={profile} />

        <MessageList
          currentUserId={user?.uid ?? ""}
          hasMoreMessages={hasMoreMessages}
          loading={loading}
          messages={messages}
          onLoadMore={loadMoreMessages}
          roomId={currentRoom?.id ?? null}
          roomName={currentRoom?.name ?? "Room"}
        />

        <MessageInput
          isDisabled={isBlocked}
          roomId={currentRoom?.id ?? null}
          senderId={user?.uid ?? null}
        />
      </div>
    </section>
  );
}
