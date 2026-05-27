import { NextResponse } from "next/server";

import { protectedResourceMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(protectedResourceMetadata());
}
