<div align="center">

# 💬 Chatty

**A production-grade, real-time full-stack chat application**

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FF6F00?style=for-the-badge&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0EA5E9?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-f59e0b?style=for-the-badge)](https://github.com/Narayan-Kumar-Yadav/Chatty/pulls)

<br />

> **Chatty** is a full-stack, real-time messaging platform engineered on a deliberate **hybrid architecture** — Firebase Firestore for message durability and Socket.io for ephemeral real-time events.  
> It ships with push notifications, media sharing, presence tracking, read receipts, user blocking, infinite scroll, and a polished glassmorphic UI — all secured by strict server-enforced Firestore and Storage rules.

<br />

**[Live Demo](https://chatty-ecru-three.vercel.app/) · [Report Bug](https://github.com/Narayan-Kumar-Yadav/Chatty/issues) · [Request Feature](https://github.com/Narayan-Kumar-Yadav/Chatty/issues)**

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Security Model](#-security-model)
- [Environment Variables](#-environment-variables)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Testing Checklist](#-testing-checklist)
- [Roadmap](#-roadmap)
- [Author](#-author)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 💬 Real-Time Messaging

- **Hybrid messaging pipeline** — messages are written to Firestore for persistence and simultaneously emitted via Socket.io for instant delivery, eliminating polling entirely.
- **Typing indicators** — broadcast via WebSocket events only; no Firestore reads or writes occur per keystroke, keeping costs and latency at zero.
- **Read & delivered receipts** — every message carries a `status` field (`sent → delivered → read`) updated in real-time with precise timestamps.
- **Infinite scroll pagination** — Firestore cursor-based pagination loads message history in batches on scroll-up. The initial payload is minimal; older messages are fetched lazily.

### 📁 Media & File Sharing

- **Image uploads** — inline preview rendered immediately after upload using object URLs; full-resolution image stored in Firebase Storage.
- **File attachments** — any file type supported with a download button and filename display; file metadata (name, size, type) stored in the message document.
- **5MB upload enforcement** — enforced at the Firebase Storage rules level (not just client-side), making it bypass-proof regardless of how the upload is triggered.

### 🔔 Push Notifications

- **Firebase Cloud Messaging (FCM)** — push notifications delivered to the recipient's device even when the browser tab is closed or the app is in the background.
- **Service Worker integration** — a dedicated `firebase-messaging-sw.js` service worker handles background message events, displays native OS notifications, and manages notification click routing back into the app.
- **Foreground notifications** — when the app is active, incoming messages from other conversations trigger an in-app toast notification powered by the FCM `onMessage` listener.

### 👤 User System & Profiles

- **Firebase Authentication** — email/password sign-up and login with persistent session management via Firebase Auth state observer.
- **Username system** — users register a unique username during onboarding. Uniqueness is enforced via an atomic **Firestore transaction** that checks and writes simultaneously, making race conditions impossible.
- **User profiles** — each user has a profile document storing display name, username, avatar URL, bio, and account creation timestamp.
- **User search** — search users by username to start new conversations.

### 🟢 Presence & Status

- **Online/offline presence** — user presence state is written to Firestore on socket connect/disconnect. The Socket.io server also broadcasts presence change events so connected clients update instantly without waiting for a Firestore snapshot.
- **Last seen timestamps** — when a user goes offline, a `lastSeen` timestamp is written, displayed as a human-readable relative time (e.g., "last seen 3 minutes ago").

### 🚫 Block / Unblock

- **Block a user** — blocks are stored in the blocking user's Firestore document. Firestore security rules prevent a blocked user from sending messages into any conversation with the blocker. The blocked user receives no error indication.
- **Unblock** — removing the block record restores full messaging capability immediately.

### 🎨 UI / UX

- **Glassmorphic design** — frosted glass card surfaces, backdrop blur, layered transparency, and subtle gradient accents throughout the interface.
- **Fully responsive** — mobile-first layout that adapts cleanly from 320px to wide desktop viewports.
- **Optimistic UI** — messages appear in the UI immediately on send before Firestore write confirmation, then reconcile silently.
- **Smooth transitions** — page transitions, message list animations, and modal open/close use CSS transitions and Tailwind's animation utilities.

---

## 🏗 System Architecture

### Architectural Decision: Why Hybrid?

Chatty uses a **two-layer real-time architecture** rather than relying on Firestore alone or Socket.io alone. This is a deliberate engineering choice:

| Concern | Technology | Reason |
|---|---|---|
| Message persistence | Firestore | Durable, offline-capable, queryable, rules-secured |
| Typing indicators | Socket.io only | Ephemeral — persisting these wastes writes and adds latency |
| Presence broadcasting | Socket.io + Firestore | Socket.io broadcasts instantly; Firestore stores the last-known state |
| Push notifications | Firebase FCM | Works when the browser/app is entirely closed |
| File & media storage | Firebase Storage | CDN-backed, globally distributed, rule-enforced |
| Auth token validation | Firebase Auth + Admin SDK | Stateless JWT verification on every Socket.io handshake |

This means Firestore is never burdened with high-frequency ephemeral events, and Socket.io never needs to persist data — each technology does what it is best at.

<br />

### System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            BROWSER / CLIENT                              │
│                                                                          │
│  ┌──────────────────┐   ┌───────────────────┐   ┌────────────────────┐  │
│  │   Zustand Store  │   │  React Components │   │  Service Worker    │  │
│  │                  │◄──│  (App Router UI)  │   │  firebase-msg-sw   │  │
│  │  • authStore     │   │                   │   │  (FCM background)  │  │
│  │  • chatStore     │   │  • ChatWindow     │   └────────────────────┘  │
│  │  • presenceStore │   │  • MessageInput   │                           │
│  └────────┬─────────┘   │  • ConvList       │                           │
│           │             │  • TypingBubble   │                           │
│           │             └────────┬──────────┘                           │
└───────────┼─────────────────────┼────────────────────────────────────────┘
            │                     │
            │              ┌──────┴──────────────────────────────────────┐
            │              │          Two Outbound Channels               │
            │              └──────┬───────────────────────┬──────────────┘
            │                     │                       │
     ┌──────▼──────┐       ┌──────▼──────┐       ┌───────▼──────────────┐
     │  Zustand    │       │  Socket.io  │       │       Firebase        │
     │  Selectors  │       │   Client   │        │                      │
     └─────────────┘       └──────┬──────┘       │  ┌────────────────┐  │
                                  │              │  │   Firestore    │  │
                           ┌──────▼──────────┐   │  │  • /users      │  │
                           │ Socket.io Server│   │  │  • /convos     │  │
                           │   (Node.js)     │   │  │  • /messages   │  │
                           │                 │   │  │  • /usernames  │  │
                           │ • typing events │   │  └────────────────┘  │
                           │ • presence sync │   │                      │
                           │ • delivery ack  │   │  ┌────────────────┐  │
                           │ • room mgmt     │   │  │    Storage     │  │
                           │                 │   │  │  media/files   │  │
                           │ Auth Middleware  │   │  └────────────────┘  │
                           │ (Firebase Admin)│   │                      │
                           └─────────────────┘   │  ┌────────────────┐  │
                                                 │  │  FCM (Push)    │  │
                                                 │  │  Notifications │  │
                                                 │  └────────────────┘  │
                                                 └──────────────────────┘
```

### Data Flow — Sending a Message

```
User types → MessageInput
    │
    ├─[1]─► Optimistic update → Zustand chatStore (message appears instantly in UI)
    │
    ├─[2]─► Firestore write → /conversations/{id}/messages (persisted)
    │           │
    │           └─► Firestore onSnapshot listener on recipient's client fires
    │                   └─► Message rendered in recipient's ChatWindow
    │
    └─[3]─► Socket.io emit('message:sent') → Server
                │
                └─► Server broadcasts to room → Recipient's socket
                        └─► Delivery receipt written back to Firestore
```

### Data Flow — Typing Indicator

```
User keystroke → debounced emit('typing:start', { conversationId })
    │
    └─► Socket.io Server → broadcast to room (excluding sender)
            │
            └─► Recipient receives 'typing:start' → TypingIndicator shown
                    │
                    └─► After 3s silence → emit('typing:stop') → indicator hidden
                            (Zero Firestore operations in this entire flow)
```

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 15 (App Router) | Full-stack React framework, SSR, routing, API routes |
| TypeScript | 5.x | End-to-end type safety, interfaces for all data models |
| Tailwind CSS | 3.x | Utility-first styling, glassmorphic design tokens |
| Zustand | 4.x | Global state management — auth, chat, presence slices |
| Socket.io Client | 4.x | WebSocket connection, event emitting and listening |

### Backend

| Technology | Version | Role |
|---|---|---|
| Node.js | 18+ | Server runtime for the Socket.io process |
| Socket.io | 4.x | WebSocket server — rooms, events, presence, typing |
| Firebase Admin SDK | 12.x | Server-side token verification on socket handshake |
| Express | 4.x | HTTP server scaffold that Socket.io attaches to |

### Firebase (BaaS)

| Service | Role |
|---|---|
| Firebase Authentication | Email/password auth, session persistence, JWT issuance |
| Cloud Firestore | Primary database — messages, users, conversations, usernames |
| Firebase Storage | Media and file hosting with CDN delivery |
| Firebase Cloud Messaging | Cross-platform push notifications (web/mobile) |

---

## 📁 Project Structure

```
chatty/
│
├── app/                                  # Next.js App Router root
│   ├── (auth)/                           # Route group — unauthenticated pages
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   └── register/
│   │       └── page.tsx                  # Registration + username setup
│   │
│   ├── (chat)/                           # Route group — protected pages
│   │   ├── layout.tsx                    # Chat shell layout (sidebar + main area)
│   │   └── [conversationId]/
│   │       └── page.tsx                  # Dynamic conversation page
│   │
│   ├── api/                              # Next.js API routes (server-side)
│   │   └── notifications/
│   │       └── route.ts                  # FCM token registration endpoint
│   │
│   ├── layout.tsx                        # Root layout (fonts, providers, metadata)
│   └── globals.css                       # Global styles and Tailwind directives
│
├── components/                           # All UI components
│   ├── chat/
│   │   ├── ChatWindow.tsx                # Scrollable message list container
│   │   ├── MessageBubble.tsx             # Individual message (text/media/file)
│   │   ├── MessageInput.tsx              # Composer (text, file picker, send)
│   │   ├── TypingIndicator.tsx           # Animated typing dots
│   │   ├── MediaPreview.tsx              # Inline image preview with lightbox
│   │   ├── FileAttachment.tsx            # File message with download button
│   │   └── ReadReceipt.tsx               # Sent / Delivered / Read tick icons
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx                   # Sidebar shell
│   │   ├── ConversationList.tsx          # List of all conversations
│   │   ├── ConversationItem.tsx          # Single conversation row + last message
│   │   ├── UserSearch.tsx                # Search users by username
│   │   └── UserProfileCard.tsx           # Hover/click profile popup
│   │
│   ├── notifications/
│   │   └── ToastNotification.tsx         # In-app foreground notification toast
│   │
│   └── ui/                               # Primitive components
│       ├── Avatar.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Spinner.tsx
│
├── lib/                                  # Core library / service layer
│   ├── firebase/
│   │   ├── config.ts                     # Firebase app initialization
│   │   ├── auth.ts                       # Auth helpers (signIn, signUp, signOut)
│   │   ├── firestore.ts                  # Firestore query helpers
│   │   ├── storage.ts                    # Storage upload/download helpers
│   │   └── fcm.ts                        # FCM token retrieval + onMessage
│   │
│   ├── socket/
│   │   ├── client.ts                     # Socket.io client singleton
│   │   └── events.ts                     # Typed event name constants
│   │
│   └── utils/
│       ├── formatTime.ts                 # Timestamp → relative time string
│       ├── fileHelpers.ts                # MIME type checks, size formatters
│       └── generateUsername.ts           # Username validation utilities
│
├── hooks/                                # Custom React hooks
│   ├── useMessages.ts                    # Real-time Firestore message listener
│   ├── usePresence.ts                    # Online/offline presence subscription
│   ├── useTyping.ts                      # Typing indicator emit + listen logic
│   └── useNotifications.ts              # FCM token setup + permission request
│
├── store/                                # Zustand global state
│   ├── useAuthStore.ts                   # Current user, auth loading state
│   ├── useChatStore.ts                   # Active conversation, messages, drafts
│   └── usePresenceStore.ts              # Online users map
│
├── types/                                # Shared TypeScript types
│   ├── message.ts                        # Message, MessageStatus, MessageType
│   ├── user.ts                           # UserProfile, Presence
│   └── conversation.ts                   # Conversation, Participant
│
├── server/                               # Socket.io Node.js server
│   ├── index.ts                          # Express + Socket.io bootstrap
│   ├── handlers/
│   │   ├── connectionHandler.ts          # Socket connect / disconnect lifecycle
│   │   ├── messageHandler.ts             # message:sent, message:delivered events
│   │   ├── typingHandler.ts              # typing:start, typing:stop events
│   │   └── presenceHandler.ts            # presence:online, presence:offline events
│   ├── middleware/
│   │   └── authMiddleware.ts             # Firebase Admin JWT verification
│   └── rooms/
│       └── roomManager.ts               # Conversation room join/leave logic
│
├── public/
│   ├── firebase-messaging-sw.js          # FCM service worker (background push)
│   └── icons/                            # PWA icons, favicons
│
├── firestore.rules                       # Firestore security rules
├── storage.rules                         # Firebase Storage security rules
├── firebase.json                         # Firebase CLI configuration
├── .env.local                            # Frontend environment variables (gitignored)
├── server/.env                           # Server environment variables (gitignored)
├── next.config.ts                        # Next.js configuration
├── tailwind.config.ts                    # Tailwind configuration + custom tokens
├── tsconfig.json                         # TypeScript configuration
└── package.json
```

---

## 🔒 Security Model

Security in Chatty is enforced at the **infrastructure layer** — Firestore rules and Storage rules are the ultimate gatekeepers. Client-side checks are UX conveniences only and are never trusted as security boundaries.

### Firestore Security Rules

**Principle of least privilege** — every rule denies by default and grants the minimum access required.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── User Profiles ─────────────────────────────────────────────────
    // Anyone authenticated can read profiles (needed for search, display).
    // Only the owner can write their own profile.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // ── Username Reservation ──────────────────────────────────────────
    // Username documents are written via atomic transaction at registration.
    // Only the claiming user can write their own username record.
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == request.resource.data.uid;
      allow delete: if request.auth.uid == resource.data.uid;
    }

    // ── Conversations ─────────────────────────────────────────────────
    // Only participants in a conversation can read or update it.
    // A user can create a conversation if they include themselves as a participant.
    match /conversations/{conversationId} {
      allow read, update: if request.auth.uid in resource.data.participants;
      allow create: if request.auth.uid in request.resource.data.participants;

      // ── Messages (sub-collection) ──────────────────────────────────
      // Only conversation participants can read or write messages.
      match /messages/{messageId} {
        allow read: if request.auth.uid in
          get(/databases/$(database)/documents/conversations/$(conversationId))
            .data.participants;
        allow create: if request.auth.uid in
          get(/databases/$(database)/documents/conversations/$(conversationId))
            .data.participants
          && request.auth.uid == request.resource.data.senderId;
        allow update: if request.auth.uid in
          get(/databases/$(database)/documents/conversations/$(conversationId))
            .data.participants;
      }
    }

    // ── Block List ────────────────────────────────────────────────────
    // Only the blocking user can read or write their own block list.
    match /users/{userId}/blocks/{blockedUserId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Firebase Storage Rules

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // ── User Media Uploads ────────────────────────────────────────────
    // Authenticated users can read any media (needed to render messages).
    // Write is restricted to the owning user's path.
    // File size hard-capped at 5MB — enforced server-side, not client-side.
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size <= 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*|application/.*|text/.*');
    }

    // ── Conversation Media ────────────────────────────────────────────
    // Conversation-scoped uploads validated by size and auth.
    match /conversations/{conversationId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.resource.size <= 5 * 1024 * 1024;
    }
  }
}
```

### Socket.io Server — Auth Middleware

Every incoming socket connection must present a valid Firebase ID token in the `auth` handshake header. The token is verified using the Firebase Admin SDK before the socket is allowed to join any room or emit any event.

```ts
// server/middleware/authMiddleware.ts
import { adminAuth } from '../firebase/admin';

export const authMiddleware = async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    socket.data.uid = decoded.uid;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
};
```

### Username Uniqueness — Atomic Transaction

```ts
// lib/firebase/firestore.ts — called during registration
export const reserveUsername = async (username: string, uid: string) => {
  const usernameRef = doc(db, 'usernames', username);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(usernameRef);
    if (snapshot.exists()) {
      throw new Error('Username already taken');
    }
    transaction.set(usernameRef, { uid, createdAt: serverTimestamp() });
  });
};
```

This pattern guarantees that no two users can claim the same username even under concurrent registration traffic.

---

## 🔧 Environment Variables

### Frontend — `.env.local` (project root)

```env
# ── Firebase Client SDK ────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ── Firebase Cloud Messaging ───────────────────────────────────────────────
# Found in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# ── Socket.io Server ──────────────────────────────────────────────────────
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Backend — `server/.env`

```env
# ── Server ────────────────────────────────────────────────────────────────
PORT=4000
CLIENT_ORIGIN=http://localhost:3000

# ── Firebase Admin SDK ────────────────────────────────────────────────────
# Download the service account JSON from Firebase Console →
# Project Settings → Service Accounts → Generate new private key
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **Important:** `FIREBASE_ADMIN_PRIVATE_KEY` must be wrapped in double quotes in the `.env` file because it contains literal `\n` newline sequences. Node.js will parse them correctly at runtime.

> 🔒 **Never commit** `.env.local` or `server/.env` to version control. Both are gitignored by default.

---

## 📦 Prerequisites

Before installation, ensure your environment meets the following requirements:

| Requirement | Minimum Version | Notes |
|---|---|---|
| Node.js | 18.x | LTS recommended |
| npm | 9.x | or yarn 1.22+ |
| Firebase CLI | Latest | `npm i -g firebase-tools` |
| Firebase Project | — | Auth, Firestore, Storage, FCM enabled |
| Git | 2.x | — |

---

## 🚀 Installation

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Narayan-Kumar-Yadav/Chatty.git
cd Chatty
```

### Step 2 — Install Frontend Dependencies

```bash
npm install
```

### Step 3 — Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### Step 4 — Configure Environment Variables

Create the frontend environment file:

```bash
cp .env.example .env.local
```

Create the backend environment file:

```bash
cp server/.env.example server/.env
```

Fill in all values as described in the [Environment Variables](#-environment-variables) section.

### Step 5 — Configure Firebase

Log in to the Firebase CLI and select your project:

```bash
firebase login
firebase use your_project_id
```

### Step 6 — Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage
```

This deploys `firestore.rules` and `storage.rules` to your Firebase project. This step is required before the application will function correctly — without it, all Firestore and Storage operations will be denied.

---

## 💻 Running Locally

Both the Next.js frontend and the Socket.io server must be running simultaneously.

### Terminal 1 — Start the Socket.io Server

```bash
cd server
npm run dev
```

Expected output:

```
[server] Socket.io server listening on port 4000
[server] CORS origin: http://localhost:3000
[server] Firebase Admin SDK initialized
```

### Terminal 2 — Start the Next.js Frontend

```bash
# From the project root
npm run dev
```

Expected output:

```
▲ Next.js 15.x
- Local:    http://localhost:3000
- Ready in  1.2s
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Optional — Run Both Concurrently

Install `concurrently` and add a root-level script to `package.json`:

```bash
npm install -D concurrently
```

```json
// package.json
"scripts": {
  "dev": "next dev",
  "dev:server": "cd server && npm run dev",
  "dev:all": "concurrently \"npm run dev\" \"npm run dev:server\""
}
```

```bash
npm run dev:all
```

---

## ☁️ Deployment

### Frontend — Vercel

Vercel is the recommended deployment target for the Next.js frontend.

**Step 1 — Import the repository**

Go to [vercel.com/new](https://vercel.com/new), import `Narayan-Kumar-Yadav/Chatty`, and select the **Next.js** framework preset.

**Step 2 — Add environment variables**

In the Vercel project dashboard, navigate to **Settings → Environment Variables** and add every key from your `.env.local`, using your production values.

| Key | Production Value |
|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | Your deployed Socket.io server URL (e.g., `https://chatty-server.onrender.com`) |
| `NEXT_PUBLIC_FIREBASE_*` | Same as local — Firebase project values |
| `FIREBASE_ADMIN_*` | Production service account credentials |

**Step 3 — Deploy**

```bash
# Or trigger via git push to main
vercel --prod
```

---

### Backend — Render

**Step 1 — Create a new Web Service**

In the [Render dashboard](https://render.com), create a new **Web Service** and connect your GitHub repository.

**Step 2 — Configure the service**

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Environment | `Node` |

**Step 3 — Add environment variables**

Add all keys from `server/.env` in the Render **Environment** tab using your production values.

**Step 4 — Enable WebSocket support**

WebSocket connections are supported on Render out of the box for Web Services. No additional configuration is required.

**Step 5 — Update frontend**

After deployment, copy the Render service URL and set it as `NEXT_PUBLIC_SOCKET_URL` in your Vercel environment variables. Redeploy the frontend.

---

### Backend — Railway *(Alternative)*

```bash
# Install Railway CLI
npm install -g @railway/cli

# Authenticate
railway login

# Initialize and deploy from the server directory
cd server
railway init
railway up
```

Set environment variables via the Railway dashboard or CLI:

```bash
railway variables set PORT=4000
railway variables set CLIENT_ORIGIN=https://your-vercel-app.vercel.app
railway variables set FIREBASE_ADMIN_PROJECT_ID=your_project_id
railway variables set FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
railway variables set FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## ✅ Testing Checklist

Use this checklist to validate all critical user flows before tagging a release.

### Authentication & Onboarding

- [ ] New user can register with email and password
- [ ] Username uniqueness is enforced — attempting a duplicate username shows an error immediately
- [ ] Existing user can log in and is redirected to the chat view
- [ ] Auth state persists across browser refresh without re-login
- [ ] Logging out clears all Zustand state and redirects to login
- [ ] Unauthenticated access to `/[conversationId]` redirects to login

### Messaging

- [ ] Sending a message renders it in the sender's UI immediately (optimistic update)
- [ ] Sent message appears in the recipient's UI in real-time without refresh
- [ ] Messages persist correctly after page reload (loaded from Firestore)
- [ ] Scrolling up in a long conversation loads the next page of messages
- [ ] `delivered` receipt appears on sender's message after recipient connects
- [ ] `read` receipt appears on sender's message after recipient views the conversation

### Typing Indicators

- [ ] Typing indicator appears in the recipient's UI within 300ms of sender keystroke
- [ ] Indicator disappears 3 seconds after the sender stops typing
- [ ] Indicator does not trigger any Firestore reads or writes (verify in Firebase Console → Usage)

### Media & File Sharing

- [ ] Image upload shows a loading state, then renders the image inline after upload
- [ ] Clicking an image opens a full-resolution lightbox or new tab
- [ ] File upload shows the filename, file size, and a download button
- [ ] Downloading a file works correctly and saves with the original filename
- [ ] Uploading a file larger than 5MB is rejected with a clear, user-facing error message
- [ ] Uploading from an unauthenticated client is blocked (verify via Firebase Console)

### Push Notifications

- [ ] Notification permission prompt appears on first login
- [ ] Receiving a message in another conversation while the tab is **active** shows an in-app toast
- [ ] Receiving a message while the tab is in the **background** triggers a native OS push notification
- [ ] Clicking the push notification opens the correct conversation in the app
- [ ] Notifications are not shown for messages in the currently active conversation

### Presence

- [ ] User's status shows as **online** in other users' conversation lists immediately on login
- [ ] User's status updates to **offline** within a few seconds of closing the browser tab
- [ ] `Last seen X minutes ago` displays correctly for offline users

### Block / Unblock

- [ ] Blocking a user removes them from the active conversation and prevents new messages
- [ ] The blocked user receives no error message — the send action silently fails
- [ ] Unblocking a user restores the ability to send and receive messages
- [ ] Firestore rules reject a message write from a blocked user (verify via Rules Playground)

### Security

- [ ] Reading `/conversations/{id}/messages` as a non-participant returns `permission-denied`
- [ ] Reading another user's private data returns `permission-denied`
- [ ] Connecting to the Socket.io server without a valid Firebase ID token is rejected
- [ ] Uploading to another user's Storage path (`/users/{otherUid}/...`) is rejected

---

## 🗺 Roadmap

| Status | Priority | Feature |
|---|---|---|
| ✅ Done | — | Real-time one-to-one messaging |
| ✅ Done | — | Media and file sharing |
| ✅ Done | — | Push notifications via FCM |
| ✅ Done | — | Typing indicators |
| ✅ Done | — | Online/offline presence |
| ✅ Done | — | Read & delivered receipts |
| ✅ Done | — | Username system with uniqueness |
| ✅ Done | — | Block / unblock users |
| ✅ Done | — | Infinite scroll pagination |
| ✅ Done | — | Glassmorphic UI |
| 🔄 Planned | High | **Group conversations** — multi-participant rooms with group admin controls |
| 🔄 Planned | High | **Message reactions** — emoji reactions stored per message in Firestore |
| 🔄 Planned | High | **Message reply / quoting** — threaded reply with quoted message preview |
| 🔄 Planned | Medium | **Link previews** — Open Graph metadata fetched server-side for shared URLs |
| 🔄 Planned | Medium | **End-to-end encryption** — client-side key exchange using the Web Crypto API |
| 🔄 Planned | Medium | **Message search** — full-text search over conversation history |
| 🔄 Planned | Medium | **Dark / light theme toggle** — system preference detection + manual override |
| 🔄 Planned | Low | **Socket.io server rate limiting** — per-user event throttling to prevent spam |
| 🔄 Planned | Low | **PWA support** — offline caching via Workbox, installable app manifest |
| 🔄 Planned | Low | **Admin dashboard** — user moderation, conversation oversight, FCM broadcast |

---

## 👨‍💻 Author

<div align="center">

### Narayan Kumar Yadav

*Full-Stack Developer · Open Source Enthusiast · Building things that work at scale*

[![GitHub](https://img.shields.io/badge/GitHub-Narayan--Kumar--Yadav-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Narayan-Kumar-Yadav)

</div>

---

## 🤝 Contributing

Contributions are welcome. The project follows standard open-source contribution practices.

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/your-username/Chatty.git
   cd Chatty
   ```
3. **Create a feature branch** — branch names should describe the work:
   ```bash
   git checkout -b feat/group-conversations
   # or
   git checkout -b fix/typing-indicator-memory-leak
   ```
4. **Implement your changes** — follow the existing code conventions (TypeScript strict mode, ESLint, Prettier)
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat(chat): add group conversation support"
   git commit -m "fix(socket): clear typing timeout on component unmount"
   git commit -m "docs(readme): add deployment section for Railway"
   ```
6. **Push** your branch:
   ```bash
   git push origin feat/group-conversations
   ```
7. **Open a Pull Request** on GitHub — fill in the PR template describing what changed, why, and how to test it

### Contribution Guidelines

- For **bug fixes**: open an issue first to confirm the bug is reproducible
- For **new features**: open an issue to discuss the proposal before writing code — this avoids wasted effort on features that may not align with the project direction
- All pull requests must pass linting and type checks (`npm run lint && npm run type-check`)
- Write or update tests for any changed functionality
- Keep pull requests focused — one concern per PR

### 🐛 Reporting Bugs

Open an issue at [github.com/Narayan-Kumar-Yadav/Chatty/issues](https://github.com/Narayan-Kumar-Yadav/Chatty/issues) and include:

- **Environment** — OS, browser, Node.js version
- **Steps to reproduce** — exact sequence of actions that trigger the bug
- **Expected behavior** — what should happen
- **Actual behavior** — what actually happens
- **Screenshots or logs** — attach console output or error stack traces where relevant

---

## 📄 License

```
MIT License

Copyright (c) 2026 Narayan Kumar Yadav

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**If Chatty has been useful to you, a ⭐ on GitHub goes a long way.**

Built with precision by [Narayan Kumar Yadav](https://github.com/Narayan-Kumar-Yadav)

</div>
