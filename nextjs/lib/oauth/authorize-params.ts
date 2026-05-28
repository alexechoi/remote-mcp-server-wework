import { z } from "zod";

export const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().optional(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
  scope: z.string().optional()
});
