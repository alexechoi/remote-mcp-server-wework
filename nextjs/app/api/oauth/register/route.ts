import { NextResponse } from "next/server";

import { registerClient } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await registerClient(await request.json()), {
      status: 201,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("OAuth client registration failed", error);
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
}
