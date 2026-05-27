"use client";

import { signInWithPopup } from "firebase/auth";
import { ArrowRight, Building2 } from "lucide-react";
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
        throw new Error("Could not create a session.");
      }
      window.location.href = searchParams.get("next") || "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-neutral-800 bg-[#111111] p-8 shadow-2xl shadow-black/40">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md bg-white text-black">
          <Building2 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-white">WeWork MCP</h1>
          <p className="text-sm text-neutral-400">Sign in to connect Claude and web chat.</p>
        </div>
      </div>
      <button
        onClick={signIn}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Continue with Google"}
        <ArrowRight size={17} />
      </button>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
