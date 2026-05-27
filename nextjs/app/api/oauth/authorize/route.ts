import { NextResponse } from "next/server";
import { z } from "zod";

import { appUrl } from "@/lib/env";
import { currentUser } from "@/lib/firebase/admin";
import { issueAuthorizationCode } from "@/lib/oauth";

export const runtime = "nodejs";

const querySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
  scope: z.string().optional()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = querySchema.parse(Object.fromEntries(url.searchParams));
  const user = await currentUser();
  if (!user) {
    const login = new URL("/login", appUrl());
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login);
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
