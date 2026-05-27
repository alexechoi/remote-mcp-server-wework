import { NextResponse } from "next/server";
import { z } from "zod";

import { exchangeAuthorizationCode, refreshAccessToken } from "@/lib/oauth";

export const runtime = "nodejs";

const tokenSchema = z.object({
  grant_type: z.enum(["authorization_code", "refresh_token"]),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  client_id: z.string().min(1),
  redirect_uri: z.string().url().optional(),
  code_verifier: z.string().optional()
});

async function formBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  return Object.fromEntries(await request.formData());
}

export async function POST(request: Request) {
  try {
    const input = tokenSchema.parse(await formBody(request));
    const tokens =
      input.grant_type === "authorization_code"
        ? await exchangeAuthorizationCode({
            code: input.code ?? "",
            clientId: input.client_id,
            redirectUri: input.redirect_uri ?? "",
            codeVerifier: input.code_verifier ?? ""
          })
        : await refreshAccessToken(input.refresh_token ?? "", input.client_id);
    return NextResponse.json(tokens);
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: error instanceof Error ? error.message : "Invalid OAuth request" },
      { status: 400 }
    );
  }
}
