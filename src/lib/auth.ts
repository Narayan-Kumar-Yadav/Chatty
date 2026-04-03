"use client";

import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";

import { auth, googleProvider } from "@/lib/firebase";

export interface AuthFailure {
  code?: string;
  error: string;
  ok: false;
}

export interface AuthSuccess {
  message: string;
  ok: true;
  user: User;
}

export interface LogoutSuccess {
  message: string;
  ok: true;
}

export type AuthResponse = AuthFailure | AuthSuccess;
export type LogoutResponse = AuthFailure | LogoutSuccess;

let persistencePromise: Promise<void> | null = null;

function ensurePersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence);
  }

  return persistencePromise;
}

function mapAuthError(error: unknown): AuthFailure {
  if (!(error instanceof FirebaseError)) {
    return {
      error: "Something went wrong. Please try again.",
      ok: false,
    };
  }

  switch (error.code) {
    case "auth/cancelled-popup-request":
      return { code: error.code, error: "Another sign-in request is already in progress.", ok: false };
    case "auth/email-already-in-use":
      return { code: error.code, error: "That email address is already in use.", ok: false };
    case "auth/invalid-credential":
      return { code: error.code, error: "Invalid email or password.", ok: false };
    case "auth/invalid-email":
      return { code: error.code, error: "Enter a valid email address.", ok: false };
    case "auth/network-request-failed":
      return { code: error.code, error: "Network error. Check your connection and try again.", ok: false };
    case "auth/operation-not-allowed":
      return { code: error.code, error: "This sign-in method is not enabled for the project.", ok: false };
    case "auth/popup-blocked":
      return { code: error.code, error: "The Google sign-in popup was blocked by your browser.", ok: false };
    case "auth/popup-closed-by-user":
      return { code: error.code, error: "The Google sign-in popup was closed before completing sign-in.", ok: false };
    case "auth/too-many-requests":
      return { code: error.code, error: "Too many attempts. Please wait a moment and try again.", ok: false };
    case "auth/user-disabled":
      return { code: error.code, error: "This account has been disabled.", ok: false };
    case "auth/user-not-found":
      return { code: error.code, error: "No account was found for that email address.", ok: false };
    case "auth/weak-password":
      return { code: error.code, error: "Use a stronger password with at least 6 characters.", ok: false };
    default:
      return {
        code: error.code,
        error: "Authentication failed. Please try again.",
        ok: false,
      };
  }
}

function toSuccess(message: string, credential: UserCredential): AuthSuccess {
  return {
    message,
    ok: true,
    user: credential.user,
  };
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    await ensurePersistence();

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    return toSuccess("Account created successfully.", credential);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    await ensurePersistence();

    const credential = await signInWithEmailAndPassword(auth, email, password);

    return toSuccess("Signed in successfully.", credential);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    await ensurePersistence();

    const credential = await signInWithPopup(auth, googleProvider);

    return toSuccess("Signed in with Google.", credential);
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function logout(): Promise<LogoutResponse> {
  try {
    await signOut(auth);

    return {
      message: "Signed out successfully.",
      ok: true,
    };
  } catch (error) {
    return mapAuthError(error);
  }
}
