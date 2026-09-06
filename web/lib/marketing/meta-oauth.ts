import "server-only";

const GRAPH = "https://graph.facebook.com/v21.0";

export const META_SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish", "business_management"];

export function metaConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function metaAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params).toString()}`, { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `Facebook API ${res.status}`);
  return body;
}

/** Authorization code → short-lived user token → long-lived (60 day) user token. */
export async function exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
  const short = await graphGet<{ access_token: string }>("oauth/access_token", {
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });
  const long = await graphGet<{ access_token: string }>("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: short.access_token,
  });
  return long.access_token;
}

/** Pages the person administers, with their (never-expiring) Page tokens. */
export async function listPages(userAccessToken: string): Promise<MetaPage[]> {
  const body = await graphGet<{ data: MetaPage[] }>("me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account{id}",
    limit: "50",
  });
  return body.data ?? [];
}
