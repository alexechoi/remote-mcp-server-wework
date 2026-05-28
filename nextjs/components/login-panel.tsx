"use client";

import { signInWithPopup } from "firebase/auth";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { firebaseAuth, googleProvider } from "@/lib/firebase/client";

export function LoginPanel() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  async function signIn() {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(firebaseAuth(), googleProvider());
      const idToken = await result.user.getIdToken();
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      });
      if (!response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        throw new Error(data.error ?? "Could not create a session.");
      }
      window.location.href = searchParams.get("next") || "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 shadow-2xl shadow-black/40">
          <span className="size-1.5 animate-pulse rounded-full bg-[#9bb7d4]" />
          Secure Google sign-in
        </div>
        <h1 className="text-balance text-4xl font-semibold leading-[1] tracking-normal text-white md:text-5xl">
          Sign in to WeWork MCP.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-neutral-400">
          Continue with Google to manage your connector, credentials, and web chat.
        </p>
      </div>
      <button
        onClick={signIn}
        disabled={loading}
        className="group flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Continue with Google"}
        <ArrowRight className="transition group-hover:translate-x-0.5" size={17} />
      </button>
      {error ? (
        <p className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}
