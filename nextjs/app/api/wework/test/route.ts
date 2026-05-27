import { NextResponse } from "next/server";

import { currentUser } from "@/lib/firebase/admin";
import { authenticateWeWork, WeWorkClient } from "@/lib/wework/client";
import { getWeWorkCredentials } from "@/lib/wework/store";

export const runtime = "nodejs";

export async function POST() {
  try {
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
  } catch (error) {
    console.error("WeWork connection test failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WeWork connection test failed" },
      { status: 500 }
    );
  }
}
