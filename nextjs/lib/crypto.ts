import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { requiredEnv } from "@/lib/env";

function encryptionKey() {
  const raw = requiredEnv("CREDENTIAL_ENCRYPTION_KEY");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) {
    return decoded;
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const packed = Buffer.from(payload, "base64");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export function secretHash(value: string) {
  return createHash("sha256").update(requiredEnv("OAUTH_TOKEN_SECRET")).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
