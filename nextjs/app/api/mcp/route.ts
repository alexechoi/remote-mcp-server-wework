import { NextResponse } from "next/server";

import { requestOrigin } from "@/lib/env";
import { handleMcpJsonRpc } from "@/lib/mcp";
import { userIdForBearerToken } from "@/lib/oauth";

export const runtime = "nodejs";

function unauthorized(request: Request) {
  return NextResponse.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${requestOrigin(request)}/.well-known/oauth-protected-resource"`
      }
    }
  );
}

export async function POST(request: Request) {
  const uid = await userIdForBearerToken(request.headers.get("authorization"));
  if (!uid) {
    return unauthorized(request);
  }
  const response = await handleMcpJsonRpc(uid, await request.json());
  if (!response) {
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(response, {
    headers: {
      "MCP-Protocol-Version": "2025-06-18"
    }
  });
}

export async function GET(request: Request) {
  return unauthorized(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS"
    }
  });
}
