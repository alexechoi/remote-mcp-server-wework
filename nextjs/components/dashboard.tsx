"use client";

import { CheckCircle2, Copy, KeyRound, LogOut, MessageSquare, PlugZap, Trash2 } from "lucide-react";
import { useState } from "react";

type Status = {
  connected: boolean;
  usernameHint?: string;
  updatedAt?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export function Dashboard({
  user,
  initialStatus,
  mcpUrl
}: {
  user: { email: string; name: string };
  initialStatus: Status;
  mcpUrl: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [username, setUsername] = useState(initialStatus.usernameHint ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Ask about bookings, available desks, locations, or your WeWork profile." }
  ]);

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

  async function testConnection() {
    setTesting(true);
    setNotice("");
    const response = await fetch("/api/wework/test", { method: "POST" });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    setTesting(false);
    setNotice(response.ok ? "Connection test passed." : data.error ?? "Connection test failed.");
  }

  async function disconnect() {
    await fetch("/api/wework/credentials", { method: "DELETE" });
    setStatus({ connected: false });
    setPassword("");
    setNotice("WeWork credentials removed.");
  }

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/login";
  }

  async function sendChat() {
    const message = chatInput.trim();
    if (!message) {
      return;
    }
    setMessages((items) => [...items, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    setChatLoading(false);
    setMessages((items) => [
      ...items,
      {
        role: "assistant",
        text: response.ok
          ? `${data.reply}\n\n${JSON.stringify(data.result, null, 2)}`
          : data.error ?? "Chat request failed."
      }
    ]);
  }

  return (
    <main className="min-h-screen bg-black text-neutral-100">
      <header className="border-b border-neutral-800 bg-[#0b0b0b]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-neutral-500">Signed in as {user.email}</p>
            <h1 className="text-2xl font-semibold text-white">WeWork MCP</h1>
          </div>
          <button onClick={signOut} className="flex h-10 items-center gap-2 rounded-md border border-neutral-700 px-3 text-sm text-neutral-200 hover:border-neutral-500 hover:bg-neutral-900">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[390px_1fr]">
        <section className="space-y-6">
          <div className="rounded-lg border border-neutral-800 bg-[#111111] p-5 shadow-xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <KeyRound size={19} />
                WeWork Credentials
              </h2>
              {status.connected ? (
                <span className="flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle2 size={16} />
                  Connected
                </span>
              ) : null}
            </div>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-neutral-400">WeWork email</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-10 w-full rounded-md border border-neutral-700 bg-black px-3 text-white outline-none focus:border-white"
                autoComplete="username"
              />
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-neutral-400">WeWork password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 w-full rounded-md border border-neutral-700 bg-black px-3 text-white outline-none focus:border-white"
                type="password"
                autoComplete="current-password"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveCredentials} disabled={saving} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={testConnection} disabled={!status.connected || testing} className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 hover:bg-neutral-900 disabled:opacity-50">
                {testing ? "Testing..." : "Test"}
              </button>
              <button onClick={disconnect} className="flex items-center gap-1 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 hover:bg-neutral-900">
                <Trash2 size={15} />
                Remove
              </button>
            </div>
            {notice ? <p className="mt-3 text-sm text-neutral-300">{notice}</p> : null}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-[#111111] p-5 shadow-xl shadow-black/30">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <PlugZap size={19} />
              Claude Connector
            </h2>
            <p className="mb-3 text-sm text-neutral-400">Use this remote MCP URL in Claude custom connectors.</p>
            <div className="flex items-center gap-2 rounded-md border border-neutral-700 bg-black p-2">
              <code className="min-w-0 flex-1 truncate text-sm text-neutral-200">{mcpUrl}</code>
              <button onClick={() => navigator.clipboard.writeText(mcpUrl)} className="rounded-md p-2 text-neutral-200 hover:bg-neutral-800" aria-label="Copy MCP URL">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-800 bg-[#111111] shadow-xl shadow-black/30">
          <div className="border-b border-neutral-800 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <MessageSquare size={19} />
              Web Chat
            </h2>
          </div>
          <div className="h-[560px] overflow-y-auto p-5">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
                  <pre
                    className={`inline-block max-w-full whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
                      message.role === "user" ? "bg-white text-black" : "bg-neutral-900 text-neutral-100"
                    }`}
                  >
                    {message.text}
                  </pre>
                </div>
              ))}
              {chatLoading ? <p className="text-sm text-neutral-500">Working...</p> : null}
            </div>
          </div>
          <div className="flex gap-2 border-t border-neutral-800 p-4">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendChat();
                }
              }}
              className="h-11 flex-1 rounded-md border border-neutral-700 bg-black px-3 text-white outline-none placeholder:text-neutral-600 focus:border-white"
              placeholder="Show my upcoming bookings"
            />
            <button onClick={sendChat} disabled={chatLoading} className="rounded-md bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-60">
              Send
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
