// File: src/lib/storage.ts
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import { auth } from "@/lib/firebase";

const storage = getStorage(auth.app);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
}

/**
 * Validate an avatar file before upload.
 * Throws a human-readable error on failure.
 */
function validateAvatarFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Only JPEG, PNG, WebP, and GIF images are supported."
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Image must be smaller than 5 MB.");
  }
}

/**
 * Upload a user avatar to Firebase Storage.
 *
 * Path: avatars/{userId}/{filename}
 *
 * @param userId    The authenticated user's UID.
 * @param file      The image File object selected by the user.
 * @param onProgress  Optional callback for upload progress (0–100%).
 * @returns         The public HTTPS download URL.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  validateAvatarFile(file);

  const extension = file.name.split(".").pop() ?? "jpg";
  const avatarRef = ref(storage, `avatars/${userId}/avatar.${extension}`);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(avatarRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: userId },
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const percent =
            snapshot.totalBytes > 0
              ? Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                )
              : 0;

          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percent,
          });
        }
      },
      (error) => {
        reject(
          new Error(
            error.code === "storage/unauthorized"
              ? "You don't have permission to upload files."
              : "Failed to upload image. Please try again."
          )
        );
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch {
          reject(new Error("Upload succeeded but failed to get the image URL."));
        }
      }
    );
  });
}

/**
 * Delete the avatar file at a given Storage URL.
 * Silently ignores "not found" errors (file already deleted).
 */
export async function deleteAvatar(downloadUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, downloadUrl);
    await deleteObject(fileRef);
  } catch (error: unknown) {
    // Ignore "object not found" — it was already deleted or never existed
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "storage/object-not-found"
    ) {
      return;
    }

    throw new Error("Failed to remove the previous avatar.");
  }
}

/**
 * Upload a media file for a chat message.
 */
export async function uploadChatMedia(
  roomId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be smaller than 5 MB.");
  }

  const timestamp = Date.now();
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const mediaRef = ref(storage, `chat-media/${roomId}/${timestamp}-${safeFilename}`);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(mediaRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const percent =
            snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percent,
          });
        }
      },
      (error) => reject(new Error("Failed to upload media. Please try again.")),
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch {
          reject(new Error("Upload succeeded but failed to get the URL."));
        }
      }
    );
  });
}
