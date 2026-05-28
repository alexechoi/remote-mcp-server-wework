import { Suspense } from "react";
import Link from "next/link";

import { LoginPanel } from "@/components/login-panel";

const fontClass = "[font-family:Apercu,'Apercu Pro','Helvetica Neue',Arial,sans-serif]";

export default function LoginPage() {
  return (
    <main className={`relative min-h-screen overflow-hidden bg-black text-white ${fontClass}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(155,183,212,0.16),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_32%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[26%] h-px w-[58vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-semibold">
          WeWork MCP
        </Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-400">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-4xl flex-col items-center justify-center px-6 pb-8 text-center">
        <Suspense>
          <LoginPanel />
        </Suspense>
      </section>
    </main>
  );
}
