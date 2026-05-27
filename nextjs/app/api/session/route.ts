import { NextResponse } from "next/server";
import { z } from "zod";

import { adminAuth, hasFirebaseServiceAccount } from "@/lib/firebase/admin";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("Failed to create Firebase session", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create a Firebase session." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
