import { NextResponse } from "next/server";
import { z } from "zod";

import { adminAuth, hasFirebaseServiceAccount } from "@/lib/firebase/admin";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  const { idToken } = bodySchema.parse(await request.json());
  const maxAge = 60 * 60 * 24 * 7;
  if (hasFirebaseServiceAccount()) {
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: maxAge * 1000 });
    await setSessionCookie(sessionCookie, maxAge);
  } else {
    await adminAuth().verifyIdToken(idToken);
    await setSessionCookie(idToken, 60 * 60);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
