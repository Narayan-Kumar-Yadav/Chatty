"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "rgba(18, 18, 26, 0.9)",
          color: "#f7f7fb",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
        },
        success: {
          iconTheme: {
            primary: "#06b6d4",
            secondary: "#0a0a0f",
          },
        },
        error: {
          iconTheme: {
            primary: "#ec4899",
            secondary: "#0a0a0f",
          },
        },
      }}
    />
  );
}
