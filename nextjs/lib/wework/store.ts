import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { decryptJson, encryptJson } from "@/lib/crypto";
import { db } from "@/lib/firebase/admin";

export const weworkCredentialsSchema = z.object({
  username: z.string().email(),
  password: z.string().min(1)
});

export type WeWorkCredentials = z.infer<typeof weworkCredentialsSchema>;

export async function saveWeWorkCredentials(uid: string, credentials: WeWorkCredentials) {
  await db().doc(`users/${uid}/secrets/wework`).set({
    encrypted: encryptJson(credentials),
    usernameHint: credentials.username,
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function getWeWorkCredentials(uid: string) {
  const snapshot = await db().doc(`users/${uid}/secrets/wework`).get();
  if (!snapshot.exists) {
    return null;
  }
  const encrypted = snapshot.get("encrypted");
  if (typeof encrypted !== "string") {
    return null;
  }
  return decryptJson<WeWorkCredentials>(encrypted);
}

export async function deleteWeWorkCredentials(uid: string) {
  await db().doc(`users/${uid}/secrets/wework`).delete();
}

export async function getWeWorkStatus(uid: string) {
  const snapshot = await db().doc(`users/${uid}/secrets/wework`).get();
  return {
    connected: snapshot.exists,
    usernameHint: snapshot.get("usernameHint") as string | undefined,
    updatedAt: snapshot.get("updatedAt")?.toDate?.()?.toISOString?.() as string | undefined
  };
}
