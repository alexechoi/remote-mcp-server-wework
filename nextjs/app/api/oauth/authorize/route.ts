import { NextResponse } from "next/server";

import { requestOrigin } from "@/lib/env";
import { currentUser } from "@/lib/firebase/admin";
import { authorizeQuerySchema } from "@/lib/oauth/authorize-params";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  authorizeQuerySchema.parse(Object.fromEntries(url.searchParams));
  const user = await currentUser();
  if (!user) {
    const login = new URL("/login", requestOrigin(request));
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(`/oauth/consent${url.search}`, requestOrigin(request)));
}
