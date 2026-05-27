import { NextResponse } from "next/server";

import { registerClient } from "@/lib/oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return NextResponse.json(await registerClient(await request.json()), { status: 201 });
}
