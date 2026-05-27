import "server-only";

import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";

import { requiredEnv } from "@/lib/env";

function privateKey() {
  return requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

export function hasFirebaseServiceAccount() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

let app: App | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

function adminApp() {
  if (app) {
    return app;
  }
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  app = hasFirebaseServiceAccount()
    ? initializeApp({
        credential: cert({
          projectId: requiredEnv("FIREBASE_PROJECT_ID"),
          clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
          privateKey: privateKey()
        })
      })
    : initializeApp({
        projectId: requiredEnv("FIREBASE_PROJECT_ID")
      });
  return app;
}

export function adminAuth() {
  auth = auth ?? getAuth(adminApp());
  return auth;
}

export function db() {
  firestore = firestore ?? getFirestore(adminApp());
  return firestore;
}

export async function currentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("__session")?.value;
  if (!session) {
    return null;
  }
  try {
    if (hasFirebaseServiceAccount()) {
      return await adminAuth().verifySessionCookie(session, true);
    }
    return await adminAuth().verifyIdToken(session, true);
  } catch {
    return null;
  }
}
