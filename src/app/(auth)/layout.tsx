import Link from "next/link";
import type { ReactNode } from "react";

import { Shield, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="page-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="flex items-center">
          <div className="max-w-2xl space-y-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/70"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/10">
                <Shield className="size-4 text-[var(--accent3)]" />
              </span>
              Chatty
            </Link>

            <div className="space-y-5">
              <p className="hero-serif text-3xl text-white/75 sm:text-4xl">
                Conversations, reimagined.
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[0.94] text-gradient sm:text-6xl">
                A premium foundation for the next phase of Chatty.
              </h1>
              <p className="max-w-xl text-base leading-8 text-white/60">
                Phase 0 focuses on clean structure, elegant styling, and a calm
                cyber-futuristic shell. Authentication and real chat flows land
                in Phase 1.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="glass-panel rounded-[24px] p-5">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.18)]">
                  <Sparkles className="size-5 text-[var(--accent2)]" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Design-first foundation
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/55">
                  Glass surfaces, neon accents, and expressive typography are
                  set globally so Phase 1 can focus on behavior instead of base
                  styling.
                </p>
              </div>
              <div className="glass-panel rounded-[24px] p-5">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-2xl bg-[rgba(6,182,212,0.16)]">
                  <Shield className="size-5 text-[var(--accent3)]" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Ready for auth
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/55">
                  The structure is ready for Firebase Auth, Zustand, and
                  protected routes without carrying unused complexity today.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
