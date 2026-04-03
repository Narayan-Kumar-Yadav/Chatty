// File: src/lib/chat.ts
import {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  startAfter,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { db } from "@/lib/firestore";
import { uploadChatMedia } from "@/lib/storage";
import { getUserProfileById, type AppUserProfile } from "@/lib/users";
import { socket } from "@/lib/socket";

// ---------------------------------------------------------------------------
// Stored shapes (raw Firestore data)
// ---------------------------------------------------------------------------

interface StoredChatRoom {
  createdAt?: Timestamp | null;
  id?: string;
  isGroup?: boolean;
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  members?: string[];
  name?: string;
  updatedAt?: Timestamp | null;
}

interface StoredChatMessage {
  createdAt?: Timestamp | null;
  deliveredTo?: string[];
  fileUrl?: string;
  imageUrl?: string;
  readBy?: string[];
  senderId?: string;
  senderLabel?: string;
  text?: string;
}

interface RoomEntry {
  data: StoredChatRoom;
  id: string;
  members: string[];
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ChatRoom {
  createdAtMs: number;
  id: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageAtMs: number;
  members: string[];
  name: string;
  otherUser?: AppUserProfile;
  updatedAtMs: number;
}

export interface ChatMessage {
  createdAtMs: number;
  deliveredTo: string[];
  fileUrl?: string;
  id: string;
  imageUrl?: string;
  readBy: string[];
  senderId: string;
  senderLabel: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toMillis(value: Timestamp | null | undefined): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function normalizeMembers(members: string[]): string[] {
  return Array.from(
    new Set(members.map((member) => member.trim()).filter(Boolean))
  ).sort();
}

function buildDirectRoomId(memberA: string, memberB: string): string {
  const sortedMembers = normalizeMembers([memberA, memberB]);

  return `dm:${sortedMembers
    .map((member) => encodeURIComponent(member))
    .join(":")}`;
}

function resolveRoomName(
  room: StoredChatRoom,
  otherUser: AppUserProfile | null,
  isGroup: boolean
): string {
  if (!isGroup && otherUser?.displayName?.trim()) {
    return otherUser.displayName.trim();
  }

  if (room.name?.trim()) {
    return room.name.trim();
  }

  return isGroup ? "Untitled Room" : "Direct chat";
}

function toRoom(
  snapshotId: string,
  room: StoredChatRoom,
  otherUser: AppUserProfile | null = null
): ChatRoom {
  const members = normalizeMembers(
    Array.isArray(room.members) ? room.members : []
  );
  const isGroup = room.isGroup === true;
  const lastMessageAtMs = toMillis(room.lastMessageAt);
  const updatedAtMs = toMillis(room.updatedAt);

  return {
    id: snapshotId,
    name: resolveRoomName(room, otherUser, isGroup),
    members,
    isGroup,
    otherUser: !isGroup && otherUser ? otherUser : undefined,
    createdAtMs: toMillis(room.createdAt),
    updatedAtMs,
    lastMessage: room.lastMessage?.trim() ?? "",
    // Use lastMessageAt when available, fall back to updatedAt for rooms
    // that pre-date this field (e.g. rooms with no messages yet).
    lastMessageAtMs: lastMessageAtMs || updatedAtMs,
  };
}

function toMessage(
  snapshotId: string,
  message: StoredChatMessage
): ChatMessage {
  return {
    id: snapshotId,
    text: message.text?.trim() || "",
    deliveredTo: Array.isArray(message.deliveredTo) ? message.deliveredTo : [],
    fileUrl: message.fileUrl?.trim() || undefined,
    imageUrl: message.imageUrl?.trim() || undefined,
    readBy: Array.isArray(message.readBy) ? message.readBy : [],
    senderId: message.senderId?.trim() || "unknown",
    senderLabel:
      message.senderLabel?.trim() || message.senderId?.trim() || "Unknown",
    createdAtMs: toMillis(message.createdAt),
  };
}

async function enrichRooms(
  roomEntries: RoomEntry[],
  currentUserId: string
): Promise<ChatRoom[]> {
  const otherUserIds = Array.from(
    new Set(
      roomEntries
        .map((room) =>
          room.data.isGroup === true
            ? null
            : room.members.find((member) => member !== currentUserId) ?? null
        )
        .filter((member): member is string => Boolean(member))
    )
  );
  const otherUsers = new Map<string, AppUserProfile | null>(
    await Promise.all(
      otherUserIds.map(
        async (
          otherUserId
        ): Promise<readonly [string, AppUserProfile | null]> => [
          otherUserId,
          await getUserProfileById(otherUserId),
        ]
      )
    )
  );

  return roomEntries
    .map((room) =>
      toRoom(
        room.id,
        room.data,
        room.data.isGroup === true
          ? null
          : (otherUsers.get(
              room.members.find((member) => member !== currentUserId) ?? ""
            ) ?? null)
      )
    )
    .sort((left, right) => right.lastMessageAtMs - left.lastMessageAtMs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createOrGetRoom(
  currentUserId: string,
  targetUserId: string
): Promise<ChatRoom> {
  const normalizedCurrentUserId = currentUserId.trim();
  const normalizedTargetUserId = targetUserId.trim();

  if (!normalizedCurrentUserId || !normalizedTargetUserId) {
    throw new Error("Both users are required to start a direct chat.");
  }

  if (normalizedCurrentUserId === normalizedTargetUserId) {
    throw new Error("You can't start a chat with yourself.");
  }

  const members = normalizeMembers([
    normalizedCurrentUserId,
    normalizedTargetUserId,
  ]);
  const roomId = buildDirectRoomId(members[0], members[1]);
  const roomRef = doc(db, "rooms", roomId);
  const [existingRoomSnapshot, targetUser] = await Promise.all([
    getDoc(roomRef),
    getUserProfileById(normalizedTargetUserId),
  ]);

  if (!targetUser) {
    throw new Error("That user is unavailable for chat right now.");
  }

  if (existingRoomSnapshot.exists()) {
    return toRoom(
      existingRoomSnapshot.id,
      existingRoomSnapshot.data() as StoredChatRoom,
      targetUser
    );
  }

  await setDoc(roomRef, {
    id: roomId,
    members,
    isGroup: false,
    lastMessage: "",
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const now = Date.now();

  return {
    id: roomId,
    members,
    isGroup: false,
    name: targetUser.displayName,
    otherUser: targetUser,
    createdAtMs: now,
    updatedAtMs: now,
    lastMessage: "",
    lastMessageAtMs: now,
  };
}

/**
 * Send a message and atomically update the parent room's lastMessage preview.
 *
 * Strategy: addDoc first (non-critical if room update fails, message is still
 * delivered), then updateDoc. Both use serverTimestamp() for consistency.
 */
export async function sendMessage(
  roomId: string,
  text: string,
  senderId: string
): Promise<void> {
  const normalizedText = text.trim();
  const normalizedRoomId = roomId.trim();
  const normalizedSenderId = senderId.trim();

  if (!normalizedRoomId) {
    throw new Error("A room is required to send a message.");
  }

  if (!normalizedSenderId) {
    throw new Error("A sender is required to send a message.");
  }

  if (!normalizedText) {
    throw new Error("Message text cannot be empty.");
  }

  const roomRef = doc(db, "rooms", normalizedRoomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists()) {
    throw new Error("Room not found.");
  }

  const roomData = roomSnapshot.data();
  if (!roomData.isGroup) {
    const members = Array.isArray(roomData.members) ? roomData.members : [];
    const otherUserId = members.find((m) => m !== normalizedSenderId);
    if (otherUserId) {
      const [senderProfile, otherProfile] = await Promise.all([
        getUserProfileById(normalizedSenderId),
        getUserProfileById(otherUserId),
      ]);
      
      if (senderProfile?.blockedUsers?.includes(otherUserId)) {
        throw new Error("You cannot send messages to a blocked user.");
      }
      if (otherProfile?.blockedUsers?.includes(normalizedSenderId)) {
        throw new Error("You cannot send messages to this user.");
      }
    }
  }

  const senderLabel =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.trim() ||
    normalizedSenderId;

  // Step 1 — write the message
  await addDoc(collection(db, "rooms", normalizedRoomId, "messages"), {
    text: normalizedText,
    senderId: normalizedSenderId,
    senderLabel,
    createdAt: serverTimestamp(),
  });

  // Step 2 — update the room's lastMessage preview + sort key
  await updateDoc(doc(db, "rooms", normalizedRoomId), {
    lastMessage: normalizedText,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const receivers = Array.isArray(roomData.members) 
    ? roomData.members.filter((m: string) => m !== normalizedSenderId)
    : [];

  if (receivers.length > 0) {
    socket.emit("new_message", {
      roomId: normalizedRoomId,
      senderLabel,
      text: normalizedText,
      receivers
    });
  }
}

/**
 * Send a media message (image or file).
 */
export async function sendMediaMessage(
  roomId: string,
  file: File,
  senderId: string
): Promise<void> {
  const normalizedRoomId = roomId.trim();
  const normalizedSenderId = senderId.trim();

  if (!normalizedRoomId || !normalizedSenderId) {
    throw new Error("Room ID and Sender ID are required.");
  }

  const senderLabel =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.trim() ||
    normalizedSenderId;

  const roomRef = doc(db, "rooms", normalizedRoomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists()) {
    throw new Error("Room not found.");
  }
  const roomData = roomSnapshot.data();

  // Upload the file
  const downloadUrl = await uploadChatMedia(normalizedRoomId, file);

  // Detect type
  const isImage = file.type.startsWith("image/");
  const imageUrl = isImage ? downloadUrl : undefined;
  const fileUrl = !isImage ? downloadUrl : undefined;

  // Create message document
  await addDoc(collection(db, "rooms", normalizedRoomId, "messages"), {
    text: file.name, // Display filename in the text field optionally, or empty
    senderId: normalizedSenderId,
    senderLabel,
    imageUrl,
    fileUrl,
    createdAt: serverTimestamp(),
  });

  // Update room lastMessage
  await updateDoc(doc(db, "rooms", normalizedRoomId), {
    lastMessage: isImage ? "📸 Image" : "📁 File",
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const receivers = Array.isArray(roomData.members) 
    ? roomData.members.filter((m: string) => m !== normalizedSenderId)
    : [];

  if (receivers.length > 0) {
    socket.emit("new_message", {
      roomId: normalizedRoomId,
      senderLabel,
      text: isImage ? "📸 Image" : "📁 File",
      receivers
    });
  }
}

export function subscribeToMessages(
  roomId: string,
  limitCount: number = 50,
  callback: (messages: ChatMessage[], lastDoc: QueryDocumentSnapshot | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesQuery = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      // Reverse so oldest messages appear first (top of chat window)
      const messages = snapshot.docs
        .map((docSnapshot) =>
          toMessage(docSnapshot.id, docSnapshot.data() as StoredChatMessage)
        )
        .reverse();

      callback(messages, lastDoc);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function fetchOlderMessages(
  roomId: string,
  lastVisible: QueryDocumentSnapshot,
  limitCount: number = 50
): Promise<{ messages: ChatMessage[]; lastDoc: QueryDocumentSnapshot | null }> {
  const messagesQuery = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt", "desc"),
    startAfter(lastVisible),
    limit(limitCount)
  );

  const snapshot = await getDocs(messagesQuery);
  const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  
  const messages = snapshot.docs
    .map((docSnapshot) =>
      toMessage(docSnapshot.id, docSnapshot.data() as StoredChatMessage)
    )
    .reverse();

  return { messages, lastDoc };
}

export function subscribeToUserRooms(
  userId: string,
  callback: (rooms: ChatRoom[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    callback([]);

    return () => undefined;
  }

  const roomsQuery = query(
    collection(db, "rooms"),
    where("members", "array-contains", normalizedUserId)
  );
  let active = true;
  let latestSequence = 0;

  const unsubscribe = onSnapshot(
    roomsQuery,
    (snapshot) => {
      const sequence = latestSequence + 1;
      latestSequence = sequence;

      void (async () => {
        const roomEntries = snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data() as StoredChatRoom;

            return {
              id: docSnapshot.id,
              data,
              members: normalizeMembers(
                Array.isArray(data.members) ? data.members : []
              ),
            };
          })
          .filter((room) => room.members.length >= 2);
        const nextRooms = await enrichRooms(roomEntries, normalizedUserId);

        if (active && sequence === latestSequence) {
          callback(nextRooms);
        }
      })().catch((error: unknown) => {
        if (!active || sequence !== latestSequence) {
          return;
        }

        onError?.(
          error instanceof Error
            ? error
            : new Error("Unable to subscribe to your rooms right now.")
        );
      });
    },
    (error) => {
      if (active) {
        onError?.(error);
      }
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function clearChat(roomId: string): Promise<void> {
  const normalizedRoomId = roomId.trim();

  if (!normalizedRoomId) {
    throw new Error("A room is required to clear a chat.");
  }

  // Get all messages in the room
  const messagesSnapshot = await getDocs(
    collection(db, "rooms", normalizedRoomId, "messages")
  );

  // Firestore batched writes can handle up to 500 operations at a time.
  const batchPromises = [];
  let currentBatch = writeBatch(db);
  let operationCount = 0;

  for (const docSnapshot of messagesSnapshot.docs) {
    currentBatch.delete(docSnapshot.ref);
    operationCount++;

    if (operationCount === 500) {
      batchPromises.push(currentBatch.commit());
      currentBatch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    batchPromises.push(currentBatch.commit());
  }

  await Promise.all(batchPromises);

  // Clear the lastMessage preview on the room document
  await updateDoc(doc(db, "rooms", normalizedRoomId), {
    lastMessage: "",
    lastMessageAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function markMessageAsRead(
  roomId: string,
  messageId: string,
  userId: string
): Promise<void> {
  if (!roomId || !messageId || !userId) return;
  const msgRef = doc(db, "rooms", roomId, "messages", messageId);
  await updateDoc(msgRef, {
    readBy: arrayUnion(userId),
  });
}

export async function markMessagesAsRead(
  roomId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  if (!roomId || messageIds.length === 0 || !userId) return;

  const batch = writeBatch(db);
  messageIds.forEach((messageId) => {
    const msgRef = doc(db, "rooms", roomId, "messages", messageId);
    batch.update(msgRef, {
      readBy: arrayUnion(userId),
    });
  });

  await batch.commit();
}

export async function markMessagesAsDelivered(
  roomId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  if (!roomId || messageIds.length === 0 || !userId) return;

  const batch = writeBatch(db);
  messageIds.forEach((messageId) => {
    const msgRef = doc(db, "rooms", roomId, "messages", messageId);
    batch.update(msgRef, {
      deliveredTo: arrayUnion(userId),
    });
  });

  await batch.commit();
}
