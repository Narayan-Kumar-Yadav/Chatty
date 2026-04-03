import type { Metadata } from "next";
import { DM_Mono, Instrument_Serif, Syne } from "next/font/google";

import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { AppToaster } from "@/components/ui/Toaster";
import "@/styles/globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-hero",
  weight: ["400"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Chatty",
  description: "A premium cyber-futuristic chat foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${instrumentSerif.variable} ${dmMono.variable}`}
    >
      <body>
        <div className="relative isolate min-h-screen overflow-hidden">
          <AuthBootstrap />
          {children}
          <AppToaster />
        </div>
      </body>
    </html>
  );
}
