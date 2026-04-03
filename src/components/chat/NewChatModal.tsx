// File: src/components/chat/NewChatModal.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Search, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUsers } from "@/hooks/useUsers";
import type { AppUserProfile } from "@/lib/users";
import { cn } from "@/lib/utils";

interface NewChatModalProps {
  currentUserId: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onStartChat: (targetUser: AppUserProfile) => Promise<void>;
}

export function NewChatModal({
  currentUserId,
  isOpen,
  isSubmitting,
  onClose,
  onStartChat,
}: NewChatModalProps) {
  const { error, loading, reset, result, searchUser } = useUsers();
  const [identifier, setIdentifier] = useState("");
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line
      setTimeout(() => setIsRendered(true), 0);

      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setIsVisible(false);

    const timeout = window.setTimeout(() => {
      // eslint-disable-next-line
      setIsRendered(false);
      setIdentifier("");
      reset();
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRendered, isSubmitting, onClose]);

  if (!isRendered) {
    return null;
  }

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUserId) {
      return;
    }

    await searchUser(identifier, currentUserId);
  };

  const handleStartChat = async () => {
    if (!result) {
      return;
    }

    await onStartChat(result);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-6 transition duration-200",
        isVisible
          ? "pointer-events-auto bg-black/55 opacity-100 backdrop-blur-sm"
          : "pointer-events-none bg-black/0 opacity-0"
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "glass-panel surface-border w-full max-w-lg rounded-[32px] p-6 transition duration-200",
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.98] opacity-0"
        )}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent3)]">
              Start a direct chat
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Find someone on Chatty
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
              Search by exact email or exact username to open a shared 1:1 room.
            </p>
          </div>

          <button
            aria-label="Close new chat modal"
            className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/65 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSearch}>
          <Input
            autoFocus
            label="Email or username"
            onChange={(event) => {
              setIdentifier(event.target.value);

              if (error || result) {
                reset();
              }
            }}
            placeholder="founder@chatty.app or @captain"
            value={identifier}
          />

          {error ? (
            <p className="text-sm leading-6 text-[var(--accent2)]">{error}</p>
          ) : null}

          <Button
            fullWidth
            icon={<Search className="size-4" />}
            loading={loading}
            type="submit"
            variant="secondary"
          >
            Search user
          </Button>
        </form>

        {result ? (
          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Match found
              </p>
              <h4 className="mt-2 text-xl font-semibold text-white">
                {result.displayName}
              </h4>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--accent3)]">
                {result.username}
              </p>
              <p className="mt-3 text-sm text-white/55">{result.email}</p>
            </div>

            <div className="mt-5">
              <Button
                fullWidth
                icon={<UserPlus className="size-4" />}
                loading={isSubmitting}
                onClick={() => {
                  void handleStartChat();
                }}
                type="button"
              >
                Start Chat
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
