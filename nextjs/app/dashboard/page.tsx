import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard";
import { appUrl } from "@/lib/env";
import { currentUser } from "@/lib/firebase/admin";
import { getWeWorkStatus } from "@/lib/wework/store";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  const status = await getWeWorkStatus(user.uid);
  return (
    <Dashboard
      user={{ email: user.email ?? "", name: user.name ?? "" }}
      initialStatus={status}
      mcpUrl={`${appUrl()}/api/mcp`}
    />
  );
}
