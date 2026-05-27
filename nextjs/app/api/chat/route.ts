import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/firebase/admin";
import { callWeWorkTool } from "@/lib/wework/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(1000)
});

function routeMessage(message: string) {
  const text = message.toLowerCase();
  const cityMatch = message.match(/\b(?:in|near|around)\s+([a-zA-Z\s]+?)(?:\s+on|\s+for|$)/);
  const dateMatch = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (text.includes("profile") || text.includes("who am i") || text.includes("me")) {
    return { tool: "me", args: {} };
  }
  if (text.includes("past booking")) {
    return { tool: "bookings", args: { past: true } };
  }
  if (text.includes("booking")) {
    return { tool: "bookings", args: {} };
  }
  if (text.includes("desk") || text.includes("space") || text.includes("available")) {
    return { tool: "desks", args: { city: cityMatch?.[1]?.trim() || "London", date: dateMatch?.[1] } };
  }
  if (text.includes("location") || text.includes("wework in")) {
    return { tool: "locations", args: { city: cityMatch?.[1]?.trim() || "London" } };
  }
  return { tool: "bookings", args: {} };
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { message } = bodySchema.parse(await request.json());
  const routed = routeMessage(message);
  const result = await callWeWorkTool(user.uid, routed.tool, routed.args);
  return NextResponse.json({
    reply: `I used the ${routed.tool} tool.`,
    tool: routed.tool,
    result
  });
}
