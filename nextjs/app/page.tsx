import Link from "next/link";
import { ArrowRight } from "lucide-react";

const fontClass = "[font-family:Apercu,'Apercu Pro','Helvetica Neue',Arial,sans-serif]";

export default function LandingPage() {
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
          <Link href="/login" className="rounded-md bg-white px-3 py-2 font-semibold text-black hover:bg-neutral-200">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-4xl flex-col items-center justify-center px-6 pb-8 pt-2 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 shadow-2xl shadow-black/40">
          <span className="size-1.5 animate-pulse rounded-full bg-[#9bb7d4]" />
          Remote connector for Claude
        </div>

        <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1] tracking-normal md:text-7xl">
          WeWork bookings, right where you ask.
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-neutral-400 md:text-lg">
          Connect your WeWork account once. Ask Claude for locations, availability, and bookings through a private MCP endpoint.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="group flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black hover:bg-neutral-200">
            Get started
            <ArrowRight className="transition group-hover:translate-x-0.5" size={17} />
          </Link>
          <Link href="/dashboard" className="flex h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-5 text-sm text-neutral-200 hover:border-white/25 hover:bg-white/[0.06]">
            Open app
          </Link>
        </div>

        <div className="mt-10 w-full max-w-lg rounded-xl border border-white/10 bg-[#080808]/90 p-2 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="rounded-lg border border-white/10 bg-black px-3 py-2.5 text-left">
              <p className="text-xs text-neutral-500">Claude</p>
              <p className="mt-1 text-sm">Find desks in London tomorrow</p>
            </div>
            <div className="relative h-px w-9 overflow-hidden bg-white/10">
              <span className="absolute inset-y-0 left-0 w-5 animate-[connector_1.8s_ease-in-out_infinite] bg-[#9bb7d4]" />
            </div>
            <div className="rounded-lg border border-white/10 bg-black px-3 py-2.5 text-left">
              <p className="text-xs text-neutral-500">WeWork MCP</p>
              <p className="mt-1 font-mono text-sm text-[#c7d7e8]">desks()</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
