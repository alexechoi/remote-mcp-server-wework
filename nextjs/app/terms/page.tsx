import Link from "next/link";

const fontClass = "[font-family:Apercu,'Apercu Pro','Helvetica Neue',Arial,sans-serif]";

export default function TermsPage() {
  return (
    <main className={`min-h-screen bg-black text-white ${fontClass}`}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-neutral-500 hover:text-white">
          WeWork MCP
        </Link>
        <h1 className="mt-10 text-4xl font-semibold">Terms</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-neutral-300">
          <p>This connector is provided for personal workspace workflows and depends on access to your own WeWork account.</p>
          <p>You are responsible for the actions you authorize through Claude or the web chat, including bookings and cancellations.</p>
          <p>The service may fail when WeWork changes its login or booking APIs. No guarantee is made that every location, booking, or cancellation flow will always be available.</p>
          <p>WeWork is a trademark of its respective owner. This project is not an official WeWork product.</p>
        </div>
      </div>
    </main>
  );
}
