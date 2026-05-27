import "server-only";

import { cookies } from "next/headers";

export async function setSessionCookie(value: string, maxAgeSeconds: number) {
  const cookieStore = await cookies();
  cookieStore.set("__session", value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/"
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
}
