import Link from "next/link";

const fontClass = "[font-family:Apercu,'Apercu Pro','Helvetica Neue',Arial,sans-serif]";

export default function PrivacyPage() {
  return (
    <main className={`min-h-screen bg-black text-white ${fontClass}`}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:text-white">
          WeWork MCP
        </Link>
        <h1 className="mt-10 text-4xl font-semibold">Privacy</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-neutral-300">
          <p>We collect the minimum information needed to run the connector: your Google account identity, encrypted WeWork credentials, and OAuth tokens used to connect Claude.</p>
          <p>WeWork credentials are encrypted before storage and are only decrypted server-side when you test the connection or make a WeWork tool request.</p>
          <p>We do not sell personal data. Operational logs should not include plaintext credentials, passwords, or bearer tokens.</p>
          <p>You can remove your saved WeWork credentials from the dashboard at any time.</p>
        </div>
      </div>
    </main>
  );
}
