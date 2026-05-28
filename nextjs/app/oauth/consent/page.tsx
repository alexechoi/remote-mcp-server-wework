import { redirect } from "next/navigation";

import { OAuthConsent } from "@/components/oauth-consent";
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
  const paramsForClient = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value ?? "")]));

  return (
    <main className={`flex min-h-screen items-center justify-center bg-black px-6 text-white ${fontClass}`}>
      <OAuthConsent params={paramsForClient} status={status} user={{ email: user.email, uid: user.uid }} />
    </main>
  );
}
