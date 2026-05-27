import { NextResponse } from "next/server";

import { currentUser } from "@/lib/firebase/admin";
import { deleteWeWorkCredentials, getWeWorkStatus, saveWeWorkCredentials, weworkCredentialsSchema } from "@/lib/wework/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getWeWorkStatus(user.uid));
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const credentials = weworkCredentialsSchema.parse(await request.json());
  await saveWeWorkCredentials(user.uid, credentials);
  return NextResponse.json(await getWeWorkStatus(user.uid));
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await deleteWeWorkCredentials(user.uid);
  return NextResponse.json({ connected: false });
}
