import { NextResponse } from "next/server";

import { oauthMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(oauthMetadata());
}
