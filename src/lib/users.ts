// File: src/lib/users.ts
import { sendPasswordResetEmail as firebaseSendPasswordReset } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";

import { auth } from "@/lib/firebase";

import { db } from "@/lib/firestore";

// ---------------------------------------------------------------------------
// Stored shapes
// ---------------------------------------------------------------------------

interface StoredUserProfile {
  bio?: string;
  blockedUsers?: string[];
  createdAt?: Timestamp | null;
  displayName?: string;
  email?: string;
  favoriteRooms?: string[];
  fcmTokens?: string[];
  id?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp | null;
  photoURL?: string;
  username?: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AppUserProfile {
  bio: string;
  blockedUsers: string[];
  createdAtMs: number;
  displayName: string;
  email: string;
  favoriteRooms: string[];
  fcmTokens: string[];
  id: string;
  isOnline?: boolean;
  lastSeenMs?: number;
  photoURL: string;
  username: string;
}

// ---------------------------------------------------------------------------
// In-Memory Cache
// ---------------------------------------------------------------------------

const profileCache = new Map<string, { data: AppUserProfile | null; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toMillis(value: Timestamp | null | undefined): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

function buildDisplayName(authUser: User): string {
  const explicitDisplayName = authUser.displayName?.trim();

  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const emailLocalPart = authUser.email?.split("@")[0]?.trim();

  if (emailLocalPart) {
    return emailLocalPart;
  }

  return "Chatty User";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Returns the canonical username used in the users collection (with @ prefix).
 * Example: "Narayan Kumar" → "@narayan_kumar"
 */
function normalizeUsername(username: string): string {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) {
    return "@user";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * Returns the raw key used as a document ID in the `usernames` collection
 * (no @ prefix, lowercase, alphanumeric + underscores only).
 * Example: "@narayan_kumar" → "narayan_kumar"
 */
function usernameToKey(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeUsernameSeed(seed: string): string {
  const normalized = seed
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "user";
}

function toUserProfile(
  snapshot: DocumentSnapshot<DocumentData>
): AppUserProfile | null {
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as StoredUserProfile;

  return {
    id: snapshot.id,
    email: normalizeEmail(data.email ?? ""),
    displayName: data.displayName?.trim() || "Chatty User",
    username: normalizeUsername(data.username ?? "@user"),
    bio: data.bio?.trim() ?? "",
    photoURL: data.photoURL?.trim() ?? "",
    blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : [],
    favoriteRooms: Array.isArray(data.favoriteRooms) ? data.favoriteRooms : [],
    fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : [],
    isOnline: data.isOnline ?? false,
    lastSeenMs: data.lastSeen ? toMillis(data.lastSeen) : undefined,
    createdAtMs: toMillis(data.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Username uniqueness — usernames collection
// ---------------------------------------------------------------------------

/**
 * Atomically claims a username for a user inside a Firestore transaction.
 *
 * Collection: `usernames`
 * Document ID: the raw username key (no @ prefix, lowercase)
 * Value: `{ uid: string }`
 *
 * If the username is already owned by a DIFFERENT user, throws an error.
 * If the username is already owned by THIS user, this is a no-op.
 */
async function claimUsername(username: string, userId: string): Promise<void> {
  const key = usernameToKey(username);

  if (!key) {
    throw new Error("Username is invalid.");
  }

  const usernameRef = doc(db, "usernames", key);

  await runTransaction(db, async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);

    if (usernameSnapshot.exists()) {
      const existingUid = (usernameSnapshot.data() as { uid: string }).uid;

      // Already claimed by this same user — allow (idempotent)
      if (existingUid === userId) {
        return;
      }

      throw new Error("That username is already taken. Please choose another.");
    }

    // Unclaimed — register it
    transaction.set(usernameRef, { uid: userId });
  });
}

/**
 * Checks username availability by querying the `usernames` collection
 * (O(1) document lookup, no full collection scan).
 */
async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const key = usernameToKey(username);

  if (!key) {
    return false;
  }

  const snapshot = await getDoc(doc(db, "usernames", key));

  if (!snapshot.exists()) {
    return true;
  }

  const { uid } = snapshot.data() as { uid: string };

  return uid === excludeUserId;
}

async function generateUniqueUsername(
  seed: string,
  excludeUserId?: string
): Promise<string> {
  const base = sanitizeUsernameSeed(seed);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = Math.floor(Math.random() * 99000) + 1000;
    const candidate = normalizeUsername(`${base}_${suffix}`);

    if (await isUsernameAvailable(candidate, excludeUserId)) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username right now.");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getUserProfileById(
  userId: string
): Promise<AppUserProfile | null> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return null;
  }

  const now = Date.now();
  const cached = profileCache.get(normalizedUserId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const profile = toUserProfile(await getDoc(doc(db, "users", normalizedUserId)));
  profileCache.set(normalizedUserId, { data: profile, timestamp: now });
  
  return profile;
}

export async function getUserByEmail(
  email: string
): Promise<AppUserProfile | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      collection(db, "users"),
      where("email", "==", normalizedEmail),
      limit(1)
    )
  );

  if (snapshot.empty) {
    return null;
  }

  return toUserProfile(snapshot.docs[0]);
}

/**
 * O(1) username lookup: usernames/{key} → uid → users/{uid}
 * Avoids a full collection scan via the indexed `usernames` mapping.
 */
export async function getUserByUsername(
  username: string
): Promise<AppUserProfile | null> {
  const key = usernameToKey(username);

  if (!key) {
    return null;
  }

  const usernameSnap = await getDoc(doc(db, "usernames", key));

  if (!usernameSnap.exists()) {
    return null;
  }

  const { uid } = usernameSnap.data() as { uid: string };

  if (!uid) {
    return null;
  }

  return getUserProfileById(uid);
}

/**
 * Creates or updates the user's Firestore profile and claims their username.
 *
 * On first login:
 *   1. Generate a unique username from their display name / email
 *   2. Claim it in the `usernames` collection (transaction-safe)
 *   3. Write the user profile to `users/<uid>`
 *
 * On subsequent logins: existing username is preserved; no re-claim needed
 * unless the username changed.
 */
export async function syncUserProfile(
  authUser: User
): Promise<AppUserProfile> {
  const normalizedEmail = normalizeEmail(authUser.email ?? "");

  if (!normalizedEmail) {
    throw new Error(
      "Unable to sync a Chatty profile without an email address."
    );
  }

  const userRef = doc(db, "users", authUser.uid);
  const existingSnapshot = await getDoc(userRef);
  const existingData = existingSnapshot.exists()
    ? (existingSnapshot.data() as StoredUserProfile)
    : null;
  const displayName = buildDisplayName(authUser);

  // Determine username: use existing one if present, otherwise generate a new one
  const rawUsername =
    existingData?.username?.trim() ||
    (await generateUniqueUsername(
      authUser.displayName?.trim() ||
        authUser.email?.split("@")[0]?.trim() ||
        "user",
      authUser.uid
    ));

  const username = normalizeUsername(rawUsername);

  await claimUsername(username, authUser.uid);

  await setDoc(
    userRef,
    {
      id: authUser.uid,
      email: normalizedEmail,
      displayName,
      username,
      ...(existingSnapshot.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    {
      merge: true,
    }
  );

  profileCache.delete(authUser.uid);

  return {
    id: authUser.uid,
    email: normalizedEmail,
    displayName,
    username,
    bio: existingData?.bio?.trim() ?? "",
    photoURL: existingData?.photoURL?.trim() ?? "",
    blockedUsers: Array.isArray(existingData?.blockedUsers)
      ? existingData.blockedUsers
      : [],
    favoriteRooms: Array.isArray(existingData?.favoriteRooms)
      ? existingData.favoriteRooms
      : [],
    fcmTokens: Array.isArray(existingData?.fcmTokens)
      ? existingData.fcmTokens
      : [],
    isOnline: existingData?.isOnline ?? false,
    lastSeenMs: existingData?.lastSeen ? toMillis(existingData.lastSeen) : undefined,
    createdAtMs: toMillis(existingData?.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Phase 3 — Profile & Identity mutations
// ---------------------------------------------------------------------------

export interface UpdateProfilePayload {
  bio?: string;
  displayName?: string;
  photoURL?: string;
}

/**
 * Update non-username profile fields (displayName, bio, photoURL).
 * Returns the updated profile.
 */
export async function updateUserProfile(
  userId: string,
  payload: UpdateProfilePayload
): Promise<void> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error("User ID is required.");
  }

  const updates: Record<string, string> = {};

  if (typeof payload.displayName === "string") {
    const trimmed = payload.displayName.trim();

    if (!trimmed) {
      throw new Error("Display name cannot be empty.");
    }

    if (trimmed.length > 50) {
      throw new Error("Display name cannot exceed 50 characters.");
    }

    updates.displayName = trimmed;
  }

  if (typeof payload.bio === "string") {
    const trimmed = payload.bio.trim();

    if (trimmed.length > 150) {
      throw new Error("Bio cannot exceed 150 characters.");
    }

    updates.bio = trimmed;
  }

  if (typeof payload.photoURL === "string") {
    updates.photoURL = payload.photoURL.trim();
  }

  if (Object.keys(updates).length === 0) {
    return; // nothing to update
  }

  await updateDoc(doc(db, "users", normalizedUserId), updates);
  profileCache.delete(normalizedUserId);
}

/**
 * Atomically change a user's username.
 *
 * Inside a single Firestore transaction:
 *   1. Verify the new username isn't claimed by someone else
 *   2. Release the old username key from the `usernames` collection
 *   3. Claim the new username key
 *   4. Update the user's profile document
 *
 * Edge cases handled:
 *   - Same username (no-op, returns immediately)
 *   - Username already taken by another user → throws
 *   - Invalid format → throws
 */
export async function updateUsername(
  userId: string,
  newRawUsername: string,
  currentRawUsername: string
): Promise<string> {
  const newUsername = normalizeUsername(newRawUsername);
  const currentUsername = normalizeUsername(currentRawUsername);

  // Validate format
  const key = usernameToKey(newUsername);

  if (!key) {
    throw new Error("Username is invalid.");
  }

  if (key.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  if (key.length > 20) {
    throw new Error("Username cannot exceed 20 characters.");
  }

  if (!/^[a-z0-9_]+$/.test(key)) {
    throw new Error(
      "Username may only contain letters, numbers, and underscores."
    );
  }

  // No change — skip
  if (newUsername === currentUsername) {
    return newUsername;
  }

  const newKeyRef = doc(db, "usernames", key);
  const oldKey = usernameToKey(currentUsername);
  const oldKeyRef = doc(db, "usernames", oldKey);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const newKeySnap = await transaction.get(newKeyRef);

    if (newKeySnap.exists()) {
      const existingUid = (newKeySnap.data() as { uid: string }).uid;

      if (existingUid !== userId) {
        throw new Error(
          "That username is already taken. Please choose another."
        );
      }

      // Already owned by this user — just make sure user doc is in sync
    } else {
      // Claim the new username key
      transaction.set(newKeyRef, { uid: userId });
    }

    // Release the old key (only if it exists and belongs to this user)
    if (oldKey) {
      const oldKeySnap = await transaction.get(oldKeyRef);

      if (oldKeySnap.exists()) {
        const oldUid = (oldKeySnap.data() as { uid: string }).uid;

        if (oldUid === userId) {
          transaction.delete(oldKeyRef);
        }
      }
    }

    // Update user profile with new username
    transaction.update(userRef, { username: newUsername });
  });

  profileCache.delete(userId);

  return newUsername;
}

/**
 * Public helper for real-time username availability checks.
 * Returns `true` if the username is free (or belongs to the excluded user).
 * Returns `false` if taken by someone else or if the format is invalid.
 */
export async function checkUsernameAvailability(
  rawUsername: string,
  excludeUserId?: string
): Promise<boolean> {
  const key = usernameToKey(rawUsername);

  if (!key || key.length < 3 || key.length > 20) {
    return false;
  }

  if (!/^[a-z0-9_]+$/.test(key)) {
    return false;
  }

  return isUsernameAvailable(rawUsername, excludeUserId);
}

/**
 * Send a Firebase password-reset email to the specified address.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("A valid email address is required.");
  }

  await firebaseSendPasswordReset(auth, normalizedEmail);
}

// ---------------------------------------------------------------------------
// Phase 4 — Blocks & Favorites
// ---------------------------------------------------------------------------

export async function blockUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (!currentUserId || !targetUserId) return;

  await updateDoc(doc(db, "users", currentUserId), {
    blockedUsers: arrayUnion(targetUserId),
  });
}

export async function unblockUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (!currentUserId || !targetUserId) return;

  await updateDoc(doc(db, "users", currentUserId), {
    blockedUsers: arrayRemove(targetUserId),
  });
}

export async function toggleFavorite(
  currentUserId: string,
  roomId: string,
  isCurrentlyFavorite: boolean
): Promise<void> {
  if (!currentUserId || !roomId) return;

  await updateDoc(doc(db, "users", currentUserId), {
    favoriteRooms: isCurrentlyFavorite
      ? arrayRemove(roomId)
      : arrayUnion(roomId),
  });
}
