import "server-only";

import { createHash } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { randomToken, secretHash } from "@/lib/crypto";
import { db } from "@/lib/firebase/admin";

export function oauthMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, "");
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"]
  };
}

export function protectedResourceMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, "");
  return {
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["wework:mcp"]
  };
}

export async function registerClient(input: any) {
  const clientId = randomToken(24);
  const clientSecret = randomToken(32);
  await db().collection("oauthClients").doc(clientId).set({
    clientId,
    clientSecretHash: secretHash(clientSecret),
    redirectUris: input.redirect_uris ?? [],
    clientName: input.client_name ?? "Claude",
    createdAt: FieldValue.serverTimestamp()
  });
  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "client_secret_post"
  };
}

function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function issueAuthorizationCode(params: {
  uid: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
}) {
  const code = randomToken(32);
  await db().collection("oauthCodes").doc(secretHash(code)).set({
    uid: params.uid,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    scope: params.scope ?? "wework:mcp",
    expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
    createdAt: FieldValue.serverTimestamp()
  });
  return code;
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const ref = db().collection("oauthCodes").doc(secretHash(input.code));
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error("invalid_grant");
  }
  const data = snapshot.data()!;
  await ref.delete();
  if (data.clientId !== input.clientId || data.redirectUri !== input.redirectUri) {
    throw new Error("invalid_grant");
  }
  if (data.expiresAt?.toMillis?.() < Date.now()) {
    throw new Error("invalid_grant");
  }
  if (pkceChallenge(input.codeVerifier) !== data.codeChallenge) {
    throw new Error("invalid_grant");
  }
  return issueTokens(data.uid, data.clientId, data.scope);
}

export async function issueTokens(uid: string, clientId: string, scope = "wework:mcp") {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  const expiresIn = 60 * 60;
  await db().collection("oauthTokens").doc(secretHash(accessToken)).set({
    uid,
    clientId,
    scope,
    expiresAt: Timestamp.fromMillis(Date.now() + expiresIn * 1000),
    createdAt: FieldValue.serverTimestamp()
  });
  await db().collection("oauthRefreshTokens").doc(secretHash(refreshToken)).set({
    uid,
    clientId,
    scope,
    createdAt: FieldValue.serverTimestamp()
  });
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope
  };
}

export async function refreshAccessToken(refreshToken: string, clientId: string) {
  const snapshot = await db().collection("oauthRefreshTokens").doc(secretHash(refreshToken)).get();
  if (!snapshot.exists) {
    throw new Error("invalid_grant");
  }
  const data = snapshot.data()!;
  if (data.clientId !== clientId) {
    throw new Error("invalid_grant");
  }
  return issueTokens(data.uid, data.clientId, data.scope);
}

export async function userIdForBearerToken(header: string | null) {
  const [scheme, token] = (header ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  const snapshot = await db().collection("oauthTokens").doc(secretHash(token)).get();
  if (!snapshot.exists) {
    return null;
  }
  const data = snapshot.data()!;
  if (data.expiresAt?.toMillis?.() < Date.now()) {
    return null;
  }
  return data.uid as string;
}
