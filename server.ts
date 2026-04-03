import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"],
  },
});

// Map to track active connections: socket.id -> userId
const activeUsers = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Presence implementation
  socket.on("user_online", (userId: string) => {
    activeUsers.set(socket.id, userId);
    console.log(`[Socket] user_online: ${userId}`);
    // Broadcast ONLY to users subscribing to this user's presence
    io.to(`presence_${userId}`).emit("presence_update", { userId, isOnline: true });
  });

  socket.on("subscribe_presence", (userIds: string[]) => {
    // Join the presence_ channels
    userIds.forEach((id) => socket.join(`presence_${id}`));

    // Immediately send back the current presence of these users
    const currentlyOnline = Array.from(activeUsers.values());
    const syncMap: Record<string, { isOnline: boolean }> = {};

    userIds.forEach((id) => {
      syncMap[id] = { isOnline: currentlyOnline.includes(id) };
    });

    socket.emit("presence_sync", syncMap);
  });

  socket.on("disconnect", () => {
    const userId = activeUsers.get(socket.id);
    if (userId) {
      console.log(`[Socket] user_offline (disconnect): ${userId}`);
      activeUsers.delete(socket.id);

      // If the user doesn't have other active sockets, mark offline
      const hasOtherSockets = Array.from(activeUsers.values()).includes(userId);
      if (!hasOtherSockets) {
        io.to(`presence_${userId}`).emit("presence_update", {
          userId,
          isOnline: false,
          lastSeenMs: Date.now(),
        });
      }
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });

  // Room / Chat logic
  socket.on("join_room", (roomId: string) => {
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} joined room ${roomId}`);
  });

  socket.on("leave_room", (roomId: string) => {
    socket.leave(roomId);
    console.log(`[Socket] ${socket.id} left room ${roomId}`);
  });

  socket.on("typing_start", ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit("typing_start", { roomId, userId });
  });

  socket.on("typing_stop", ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit("typing_stop", { roomId, userId });
  });

  socket.on("message_read", ({ roomId, messageIds, userId }: { roomId: string; messageIds: string[]; userId: string }) => {
    socket.to(roomId).emit("message_read", { roomId, messageIds, userId });
  });

  socket.on("message_delivered", ({ roomId, messageIds, userId }: { roomId: string; messageIds: string[]; userId: string }) => {
    socket.to(roomId).emit("message_delivered", { roomId, messageIds, userId });
  });

  socket.on("new_message", ({ roomId, senderLabel, text, receivers }: { roomId: string; senderLabel: string; text: string; receivers: string[] }) => {
    receivers.forEach((receiverId) => {
      const isOnline = Array.from(activeUsers.values()).includes(receiverId);
      if (!isOnline) {
        // Mock FCM push notification since Firebase Admin SDK is not fully configured here
        console.log(`\n[push_notification_mock] Sending FCM to offline user: ${receiverId}`);
        console.log(`[push_notification_mock] Room: ${roomId}`);
        console.log(`[push_notification_mock] Title: ${senderLabel}`);
        console.log(`[push_notification_mock] Body: ${text}\n`);
      }
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`> Socket.io server running separately on http://localhost:${PORT}`);
});
