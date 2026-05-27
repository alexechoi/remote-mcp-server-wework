import { NextResponse } from "next/server";

import { requestOrigin } from "@/lib/env";
import { protectedResourceMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json(protectedResourceMetadata(requestOrigin(request)));
}
