"use client";

import { useState, useRef, type FormEvent } from "react";
import toast from "react-hot-toast";

import { ArrowUpRight, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useTyping } from "@/hooks/useTyping";
import { sendMessage, sendMediaMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  isDisabled?: boolean;
  roomId: string | null;
  senderId: string | null;
}

export function MessageInput({ isDisabled, roomId, senderId }: MessageInputProps) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleType } = useTyping(roomId, senderId);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !roomId || !senderId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      await sendMediaMessage(roomId, file, senderId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload file."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomId || !senderId) {
      toast.error("Pick a room before sending a message.");
      return;
    }

    if (!text.trim()) {
      return;
    }

    setIsSending(true);

    try {
      await sendMessage(roomId, text, senderId);
      setText("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send your message right now."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form
      className="border-t border-white/10 px-6 py-5"
      onSubmit={handleSubmit}
    >
      <div className="glass-panel flex items-center gap-3 rounded-[28px] p-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!roomId || !senderId || isSending || isUploading || isDisabled}
          className="flex items-center justify-center rounded-full p-2 text-white/50 transition duration-200 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50"
          title="Attach file"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <input
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/35",
            isDisabled && "opacity-50"
          )}
          disabled={!roomId || !senderId || isSending || isUploading || isDisabled}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.trim()) {
              handleType();
            }
          }}
          placeholder={
            isDisabled
              ? "You cannot reply to this conversation"
              : roomId
              ? "Write a message..."
              : "Select a room to start chatting"
          }
          type="text"
          value={text}
        />
        <Button
          disabled={!roomId || !senderId || isSending || isUploading || isDisabled || (!text.trim() && !isUploading)}
          icon={<ArrowUpRight className="size-4" />}
          loading={isSending || isUploading}
          size="sm"
          type="submit"
        >
          Send
        </Button>
      </div>
    </form>
  );
}
