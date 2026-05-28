"use client";

import Link from "next/link";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

type ConsentStatus = {
  connected: boolean;
  usernameHint?: string;
};

type OAuthConsentProps = {
  params: Record<string, string>;
  status: ConsentStatus;
  user: {
    email?: string | null;
    uid: string;
  };
};

export function OAuthConsent({ params, status: initialStatus, user }: OAuthConsentProps) {
  const [status, setStatus] = useState(initialStatus);
  const [username, setUsername] = useState(initialStatus.usernameHint ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function saveCredentials() {
    setSaving(true);
    setNotice("");

    const response = await fetch("/api/wework/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    setSaving(false);
    if (!response.ok) {
      setNotice(data.error ?? "Could not save credentials.");
      return;
    }

    setPassword("");
    setStatus(data);
    setNotice("WeWork credentials saved.");
  }

  return (
    <section className="w-full max-w-lg rounded-xl border border-white/10 bg-[#101010] p-6 shadow-2xl shadow-black/50">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md bg-white text-black">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="text-sm text-neutral-500">Authorize Claude</p>
          <h1 className="text-2xl font-semibold">Connect WeWork MCP</h1>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-black p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Google account</span>
          <span className="text-right text-neutral-100">{user.email ?? user.uid}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">WeWork account</span>
          <span className="text-right text-neutral-100">{status.usernameHint ?? "Not connected"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Requested access</span>
          <span className="text-right text-neutral-100">{params.scope ?? "wework:mcp"}</span>
        </div>
      </div>

      {!status.connected ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-black p-4">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <KeyRound size={17} />
            WeWork Credentials
          </h2>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-neutral-400">WeWork email</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-10 w-full rounded-md border border-neutral-700 bg-[#101010] px-3 text-white outline-none focus:border-white"
              autoComplete="username"
            />
          </label>
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-neutral-400">WeWork password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-neutral-700 bg-[#101010] px-3 text-white outline-none focus:border-white"
              type="password"
              autoComplete="current-password"
            />
          </label>
          <button
            type="button"
            onClick={saveCredentials}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-60"
          >
            <KeyRound size={16} />
            {saving ? "Saving..." : "Save credentials"}
          </button>
          {notice ? <p className="mt-3 text-sm text-neutral-300">{notice}</p> : null}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          <CheckCircle2 size={17} />
          WeWork credentials saved.
        </div>
      )}

      <form action="/api/oauth/consent" method="POST" className="mt-6 flex gap-3">
        {Object.entries(params).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <Link href="/dashboard" className="flex h-11 flex-1 items-center justify-center rounded-md border border-white/10 text-sm text-neutral-200 hover:border-white/25">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!status.connected}
          className="h-11 flex-1 rounded-md bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Authorize Claude
        </button>
      </form>
    </section>
  );
}
