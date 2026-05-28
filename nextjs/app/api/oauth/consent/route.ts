import { NextResponse } from "next/server";

import { currentUser } from "@/lib/firebase/admin";
import { issueAuthorizationCode } from "@/lib/oauth";
import { authorizeQuerySchema } from "@/lib/oauth/authorize-params";
import { getWeWorkStatus } from "@/lib/wework/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const params = authorizeQuerySchema.parse(Object.fromEntries(formData));
  const user = await currentUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/oauth/consent?${new URLSearchParams(params as Record<string, string>).toString()}`);
    return NextResponse.redirect(login);
  }

  const status = await getWeWorkStatus(user.uid);
  if (!status.connected) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const code = await issueAuthorizationCode({
    uid: user.uid,
    clientId: params.client_id,
    redirectUri: params.redirect_uri,
    codeChallenge: params.code_challenge,
    scope: params.scope
  });
  const redirect = new URL(params.redirect_uri);
  redirect.searchParams.set("code", code);
  if (params.state) {
    redirect.searchParams.set("state", params.state);
  }
  return NextResponse.redirect(redirect);
}
