import "server-only";

import { createHash, randomBytes } from "node:crypto";

export type WeWorkTokenLogin = {
  a0token?: string;
  accessToken?: string;
  token?: string;
  username?: string;
};

type Auth0Config = {
  client_id: string;
  domain: string;
  redirect_uri: string;
  audience: string;
};

type OAuthTokenResponse = {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

const auth0Client =
  "eyJuYW1lIjoiQGF1dGgwL2F1dGgwLWFuZ3VsYXIiLCJ2ZXJzaW9uIjoiMS4xMS4xLmN1c3RvbSIsImVudiI6eyJhbmd1bGFyL2NvcmUiOiIxMy4xLjEifX0=";

class AuthSession {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly domain: string) {
    this.cookies.set("auth0.zE51Ep7FttlmtQV6ZEGyJKsY2jD1EtAu.is.authenticated", "true");
    this.cookies.set("_legacy_auth0.zE51Ep7FttlmtQV6ZEGyJKsY2jD1EtAu.is.authenticated", "true");
  }

  headers(extra?: HeadersInit): HeadersInit {
    const cookie = [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    return {
      ...baseHeaders(),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra
    };
  }

  async fetch(url: string | URL, init: RequestInit = {}) {
    const response = await fetch(url, {
      ...init,
      headers: this.headers(init.headers),
      cache: "no-store",
      redirect: init.redirect ?? "manual"
    });
    this.storeCookies(response);
    return response;
  }

  resolve(location: string, base?: string | URL) {
    return new URL(location, base ?? `https://${this.domain}`);
  }

  setCookie(name: string, value: string) {
    this.cookies.set(name, value);
  }

  private storeCookies(response: Response) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() ?? splitSetCookie(response.headers.get("set-cookie"));
    for (const item of setCookies) {
      const pair = item.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx > 0) {
        this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
      }
    }
  }
}

function splitSetCookie(header: string | null) {
  if (!header) {
    return [];
  }
  return header.split(/,(?=\s*[^;,]+=)/g).map((value) => value.trim());
}

function baseHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Request-Source": "com.wework.ondemand/WorkplaceOne/Prod/iOS/2.71.0(26.1)",
    WeWorkMemberType: "2",
    Origin: "https://members.wework.com",
    Referer: "https://members.wework.com/workplaceone/content2/dashboard",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.1 Safari/605.1.15",
    "Accept-Language": "en-US,en;q=0.9"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers.WeWorkAuth = `Bearer ${token}`;
    const uuid = extractUuidFromJwt(token);
    if (uuid) {
      headers.WeWorkUUID = uuid;
    }
  }
  return headers;
}

async function jsonFetch<T>(url: string, init: RequestInit = {}, session?: AuthSession) {
  const response = session
    ? await session.fetch(url, init)
    : await fetch(url, {
        ...init,
        headers: {
          ...baseHeaders(),
          ...init.headers
        },
        cache: "no-store",
        redirect: init.redirect ?? "follow"
      });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  if (!response.ok) {
    throw new Error(`WeWork request failed (${response.status}): ${text.slice(0, 400)}`);
  }
  return data;
}

function randomBase64Url(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function codeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function extractUuidFromJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return "";
  }
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    return typeof claims["https://wework.com/user_uuid"] === "string"
      ? (claims["https://wework.com/user_uuid"] as string)
      : "";
  } catch {
    return "";
  }
}

async function getAuth0Config(session?: AuthSession) {
  const params = new URLSearchParams({
    companyId: "00000000-0000-0000-0000-000000000000",
    domain: "members.wework.com"
  });
  return jsonFetch<Auth0Config>(`https://members.wework.com/workplaceone/api/auth0/config?${params}`, {}, session);
}

async function authenticateWithPassword(config: Auth0Config, username: string, password: string, session: AuthSession) {
  const response = await jsonFetch<{ login_ticket?: string; error?: string; error_description?: string }>(
    `https://${config.domain}/co/authenticate`,
    {
      method: "POST",
      headers: {
        "Auth0-Client": auth0Client,
        Referer: "https://members.wework.com/workplaceone/content2/login"
      },
      body: JSON.stringify({
        client_id: config.client_id,
        username,
        password,
        realm: "id-wework",
        credential_type: "http://auth0.com/oauth/grant-type/password-realm"
      })
    },
    session
  );
  if (!response.login_ticket) {
    throw new Error(response.error_description || response.error || "WeWork authentication did not return a login ticket");
  }
  return response.login_ticket;
}

async function exchangeTicket(
  config: Auth0Config,
  loginTicket: string,
  verifier: string,
  session: AuthSession,
  credentials: { username: string; password: string }
) {
  const state = randomBase64Url(16);
  const nonce = randomBase64Url(16);
  const transaction = encodeURIComponent(
    JSON.stringify({
      nonce,
      code_verifier: verifier,
      scope: "openid profile email offline_access",
      audience: config.audience,
      redirect_uri: config.redirect_uri,
      state
    })
  );
  session.setCookie(`_legacy_a0.spajs.txs.${config.client_id}`, transaction);
  session.setCookie(`a0.spajs.txs.${config.client_id}`, transaction);

  const authorize = new URL(`https://${config.domain}/authorize`);
  authorize.search = new URLSearchParams({
    redirect_uri: config.redirect_uri,
    client_id: config.client_id,
    audience: config.audience,
    scope: "openid profile email offline_access",
    response_type: "code",
    response_mode: "query",
    nonce,
    state,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: "S256",
    auth0Client,
    login_ticket: loginTicket
  }).toString();

  let currentUrl: URL = authorize;
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await session.fetch(currentUrl, { redirect: "manual" });
    const location = response.headers.get("location");
    const candidate = location ? session.resolve(location, currentUrl) : new URL(response.url || currentUrl);
    const code = candidate.searchParams.get("code");
    if (code) {
      if (candidate.searchParams.get("state") !== state) {
        throw new Error("WeWork authorization state mismatch");
      }
      return jsonFetch<OAuthTokenResponse>(
        `https://${config.domain}/oauth/token`,
        {
          method: "POST",
          body: JSON.stringify({
            client_id: config.client_id,
            code_verifier: verifier,
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirect_uri
          })
        },
        session
      );
    }
    if (response.status >= 300 && response.status < 400 && location) {
      currentUrl = candidate;
      continue;
    }
    if (response.status === 200) {
      const body = await response.text();
      const next = await submitIntermediateForm(body, currentUrl, session, credentials);
      if (next) {
        const nextLocation = next.headers.get("location");
        if (nextLocation) {
          currentUrl = session.resolve(nextLocation, currentUrl);
          continue;
        }
        currentUrl = new URL(next.url || currentUrl);
        continue;
      }
      throw new Error(`WeWork authorization did not return a code (${response.status}): ${body.slice(0, 300)}`);
    }
    const body = await response.text();
    throw new Error(`WeWork authorization did not return a code (${response.status}): ${body.slice(0, 300)}`);
  }
  throw new Error("WeWork authorization exceeded redirect limit");
}

async function submitIntermediateForm(
  html: string,
  baseUrl: URL,
  session: AuthSession,
  credentials: { username: string; password: string }
) {
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map((match) => match[0]);
  for (const form of forms) {
    const names = [...form.matchAll(/<input\b[^>]*\bname=(["']?)([^"'\s>]+)\1[^>]*>/gi)].map((match) => match[2]);
    const has = (name: string) => names.includes(name);
    if (!has("js-available") && !has("username") && !has("password")) {
      continue;
    }

    const attrs = form.match(/<form\b([^>]*)>/i)?.[1] ?? "";
    const action = attr(attrs, "action") || baseUrl.toString();
    const method = (attr(attrs, "method") || "POST").toUpperCase();
    const values = new URLSearchParams();

    for (const input of form.matchAll(/<input\b([^>]*)>/gi)) {
      const inputAttrs = input[1];
      const name = attr(inputAttrs, "name");
      if (!name) {
        continue;
      }
      values.set(name, attr(inputAttrs, "value") || "");
    }

    if (has("js-available")) {
      values.set("js-available", "true");
    }
    if (has("webauthn-available")) {
      values.set("webauthn-available", "false");
    }
    if (has("webauthn-platform-available")) {
      values.set("webauthn-platform-available", "false");
    }
    if (has("is-brave")) {
      values.set("is-brave", "false");
    }
    if (has("username")) {
      values.set("username", credentials.username);
    }
    if (has("password")) {
      values.set("password", credentials.password);
    }

    const target = session.resolve(action, baseUrl);
    if (method === "GET") {
      target.search = values.toString();
      return session.fetch(target, { redirect: "manual", headers: { Referer: baseUrl.toString() } });
    }
    return session.fetch(target, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: baseUrl.toString()
      },
      body: values.toString()
    });
  }
  return null;
}

function attr(source: string, name: string) {
  const pattern = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = source.match(pattern);
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

async function loginToWeWork(config: Auth0Config, tokens: OAuthTokenResponse, session: AuthSession) {
  return jsonFetch<WeWorkTokenLogin>("https://members.wework.com/workplaceone/api/auth0/login-by-auth0-token", {
    method: "POST",
    body: JSON.stringify({
      id_token: tokens.id_token,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type,
      client_id: config.client_id,
      audience: config.audience
    })
  }, session);
}

export async function authenticateWeWork(username: string, password: string) {
  const session = new AuthSession("members.wework.com");
  const config = await getAuth0Config(session);
  const verifier = randomBase64Url(32);
  const loginTicket = await authenticateWithPassword(config, username, password, session);
  const tokens = await exchangeTicket(config, loginTicket, verifier, session, { username, password });
  const login = await loginToWeWork(config, tokens, session);
  const token = login.a0token || login.accessToken || login.token;
  if (!token) {
    throw new Error("WeWork login did not return an API token");
  }
  return { token, login };
}

export class WeWorkClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://members.wework.com${path}`, {
      ...init,
      headers: {
        ...baseHeaders(this.token),
        ...init.headers
      },
      cache: "no-store"
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as T) : ({} as T);
    if (!response.ok) {
      throw new Error(`WeWork API error (${response.status}): ${text.slice(0, 400)}`);
    }
    return data;
  }

  getProfile() {
    return this.request("/workplaceone/api/wework-yardi/user/get-user-profile");
  }

  getLocationsByGeo(city: string) {
    const params = new URLSearchParams({
      isAuthenticated: "true",
      city,
      isOnDemandUser: "false",
      isWeb: "true"
    });
    return this.request(`/workplaceone/api/wework-yardi/ondemand/get-locations-by-geo?${params}`);
  }

  getAvailableSpaces(date: string, locationUUIDs: string[]) {
    const params = new URLSearchParams({
      locationUUIDs: locationUUIDs.join(","),
      closestCity: "",
      userLatitude: "",
      userLongitude: "",
      boundnwLat: "",
      boundnwLng: "",
      boundseLat: "",
      boundseLng: "",
      type: "0",
      offset: "0",
      limit: "50",
      roomTypeFilter: "",
      date,
      duration: "30",
      locationOffset: "+00:00",
      isWeb: "true",
      capacity: "0",
      endDate: ""
    });
    return this.request(`/workplaceone/api/spaces/get-spaces?${params}`);
  }

  getUpcomingBookings() {
    return this.request("/workplaceone/api/common-booking/upcoming-bookings");
  }

  getPastBookings(startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
    return this.request(`/workplaceone/api/common-booking/past-bookings?${params}`);
  }

  getLocationFeatures(locationUuid: string, amenitiesOnly = false) {
    const params = new URLSearchParams({ locationUuid, amenitiesOnly: String(amenitiesOnly) });
    return this.request(`/workplaceone/api/wework-yardi/locations/features?${params}`);
  }

  getBookingQuote(date: string, space: any) {
    return this.request("/workplaceone/api/common-booking/quote", {
      method: "POST",
      body: JSON.stringify(bookingPayload(date, space))
    });
  }

  async postBooking(date: string, space: any) {
    const quote: any = await this.getBookingQuote(date, space);
    return this.request("/workplaceone/api/common-booking/", {
      method: "POST",
      body: JSON.stringify({
        ...bookingPayload(date, space),
        ApplicationType: "WorkplaceOne",
        PlatformType: "iOS_APP",
        CreditRatio: quote?.grandTotal?.creditRatio ?? quote?.GrandTotal?.CreditRatio ?? 1,
        SpaceID: bookingSpaceId(space)
      })
    });
  }

  cancelBooking(request: any, isOnDemand = false, platformType = 2) {
    const params = new URLSearchParams({
      isOnDemand: String(isOnDemand),
      platFormType: String(platformType)
    });
    return this.request(`/workplaceone/api/common-booking/cancel?${params}`, {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
}

function bookingTimes(date: string, space: any) {
  const open = typeof space?.openTime === "string" && space.openTime.length >= 5 ? space.openTime.slice(0, 5) : "08:30";
  const close = typeof space?.closeTime === "string" && space.closeTime.length >= 5 ? space.closeTime.slice(0, 5) : "20:00";
  return {
    open,
    close,
    startTime: `${date}T${open}:00Z`,
    endTime: `${date}T${close}:00Z`
  };
}

function bookingSpaceId(space: any) {
  const accountType = space?.location?.accountType;
  if (accountType === 2 && space?.reservable?.kubeId) {
    return space.reservable.kubeId;
  }
  if ((accountType === 2 || accountType === 4) && space?.inventoryUuid) {
    return space.inventoryUuid;
  }
  return space?.uuid;
}

function quoteSpaceId(space: any) {
  return space?.inventoryUuid || space?.uuid;
}

function bookingPayload(date: string, space: any) {
  const times = bookingTimes(date, space);
  const location = space?.location ?? {};
  return {
    SpaceType: 4,
    ReservationID: "",
    TriggerCalendarEvent: true,
    Notes: null,
    MailData: {
      dayFormatted: date,
      startTimeFormatted: times.open,
      endTimeFormatted: times.close,
      floorAddress: "",
      locationAddress: location?.address?.line1,
      creditsUsed: "0",
      Capacity: "1",
      TimezoneUsed: `GMT ${location?.timezoneOffset ?? ""}`,
      TimezoneIana: location?.timeZone,
      startDateTime: `${date} ${times.open}`,
      endDateTime: `${date} ${times.close}`,
      locationName: location?.name,
      locationCity: location?.address?.city,
      locationCountry: location?.address?.country,
      locationState: location?.address?.state
    },
    LocationType: location?.accountType,
    UTCOffset: location?.timezoneOffset,
    Currency: "com.wework.credits",
    LocationID: location?.uuid,
    SpaceID: quoteSpaceId(space),
    WeWorkSpaceID: space?.uuid,
    StartTime: times.startTime,
    EndTime: times.endTime
  };
}
