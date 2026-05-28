import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { currentUser } from "@/lib/firebase/admin";
import { authorizeQuerySchema } from "@/lib/oauth/authorize-params";
import { getWeWorkStatus } from "@/lib/wework/store";

const fontClass = "[font-family:Apercu,'Apercu Pro','Helvetica Neue',Arial,sans-serif]";

export const runtime = "nodejs";

export default async function OAuthConsentPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const paramsObject = await searchParams;
  const params = authorizeQuerySchema.parse(
    Object.fromEntries(
      Object.entries(paramsObject).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    )
  );
  const user = await currentUser();
  if (!user) {
    redirect(`/login?next=/oauth/consent?${new URLSearchParams(params as Record<string, string>).toString()}`);
  }
  const status = await getWeWorkStatus(user.uid);

  return (
    <main className={`flex min-h-screen items-center justify-center bg-black px-6 text-white ${fontClass}`}>
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
          <div className="mt-5 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            Save your WeWork credentials in the dashboard before authorizing Claude.
          </div>
        ) : null}

        <form action="/api/oauth/consent" method="POST" className="mt-6 flex gap-3">
          {Object.entries(params).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={String(value ?? "")} />
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
    </main>
  );
}
