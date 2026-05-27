import { NextResponse } from "next/server";

import { currentUser } from "@/lib/firebase/admin";
import { authenticateWeWork, WeWorkClient } from "@/lib/wework/client";
import { getWeWorkCredentials } from "@/lib/wework/store";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const credentials = await getWeWorkCredentials(user.uid);
  if (!credentials) {
    return NextResponse.json({ error: "No WeWork credentials saved" }, { status: 400 });
  }
  const { token } = await authenticateWeWork(credentials.username, credentials.password);
  const profile = await new WeWorkClient(token).getProfile();
  return NextResponse.json({ ok: true, profile });
}
