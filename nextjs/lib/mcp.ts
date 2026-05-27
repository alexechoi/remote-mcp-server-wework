import "server-only";

import { z } from "zod";

import { callWeWorkTool } from "@/lib/wework/service";

const protocolVersion = "2025-06-18";

const jsonRpcRequest = z.object({
  jsonrpc: z.string().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.any().optional()
});

const tools = [
  {
    name: "locations",
    description: "List WeWork locations in a city.",
    inputSchema: {
      type: "object",
      required: ["city"],
      properties: { city: { type: "string", description: "City name, e.g. London" } },
      additionalProperties: false
    }
  },
  {
    name: "desks",
    description: "List available spaces for a date, by location UUID or city.",
    inputSchema: {
      type: "object",
      properties: {
        location_uuid: { type: "string" },
        city: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" }
      },
      additionalProperties: false
    }
  },
  {
    name: "find_space",
    description: "Alias for desks.",
    inputSchema: {
      type: "object",
      properties: {
        location_uuid: { type: "string" },
        city: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" }
      },
      additionalProperties: false
    }
  },
  {
    name: "bookings",
    description: "List upcoming bookings or past bookings with optional date filters.",
    inputSchema: {
      type: "object",
      properties: {
        past: { type: "boolean" },
        start_date: { type: "string" },
        end_date: { type: "string" }
      },
      additionalProperties: false
    }
  },
  {
    name: "info",
    description: "Get detailed information for a WeWork location.",
    inputSchema: {
      type: "object",
      properties: {
        location_uuid: { type: "string" },
        amenities_only: { type: "boolean" }
      },
      additionalProperties: false
    }
  },
  {
    name: "me",
    description: "Get the current user's WeWork profile.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "calendar",
    description: "Generate an ICS calendar payload from bookings.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "quote",
    description: "Get booking quotes for one date.",
    inputSchema: { type: "object", required: ["date"], properties: { date: { type: "string" } }, additionalProperties: true }
  },
  {
    name: "book",
    description: "Book a workspace for one date.",
    inputSchema: { type: "object", required: ["date"], properties: { date: { type: "string" } }, additionalProperties: true }
  },
  {
    name: "cancel_booking",
    description: "Cancel an upcoming booking by booking UUID.",
    inputSchema: {
      type: "object",
      required: ["booking_uuid"],
      properties: { booking_uuid: { type: "string" } },
      additionalProperties: true
    }
  }
];

function success(result: unknown) {
  const text = JSON.stringify(result, null, 2);
  return {
    content: [{ type: "text", text }],
    structuredContent: result,
    isError: false
  };
}

function toolError(error: unknown) {
  return {
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
    isError: true
  };
}

export async function handleMcpJsonRpc(uid: string, body: unknown) {
  const request = jsonRpcRequest.parse(body);
  const id = request.id;
  if (id === undefined) {
    return null;
  }

  try {
    switch (request.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "wework", version: "0.1.0" }
          }
        };
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools } };
      case "tools/call": {
        const params = z.object({ name: z.string(), arguments: z.any().optional() }).parse(request.params);
        try {
          const result = await callWeWorkTool(uid, params.name, params.arguments ?? {});
          return { jsonrpc: "2.0", id, result: success(result) };
        } catch (error) {
          return { jsonrpc: "2.0", id, result: toolError(error) };
        }
      }
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: "method not found" } };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: error instanceof Error ? error.message : "internal error" }
    };
  }
}
