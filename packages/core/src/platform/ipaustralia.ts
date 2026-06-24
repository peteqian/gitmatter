// IP Australia search APIs, baked into the backend (like CourtListener). Exposed
// as gitmatter's own tools — over our MCP server (to Claude/agents) and in-app
// chat — gated to the AU jurisdiction. Two read-only products: Australian Patent
// Search and Australian Trade Mark Search.
//
// Auth differs from CourtListener: IP Australia uses OAuth 2.0 client_credentials.
// We exchange a client_id/secret pair for a short-lived bearer token at a shared
// token endpoint, cache it per client_id until just before expiry, then send it as
// `Authorization: Bearer`. Credentials are server-env only (one Anypoint app per
// product) — there is no per-user bring-your-own-key here.

import { getEnv } from "../core/config.js";
import { fetchWithTimeout } from "../core/fetch.js";

const TOKEN_URL = "https://test.api.ipaustralia.gov.au/public/external-token-api/v1/access_token";
const PATENT_BASE = "https://test.api.ipaustralia.gov.au/public/australian-patent-search-api/v1";
const TRADEMARK_BASE =
  "https://test.api.ipaustralia.gov.au/public/australian-trade-mark-search-api/v1";

type Creds = { clientId: string; clientSecret: string };

function patentCreds(): Creds | null {
  const clientId = getEnv("AUSTRALIAN_PATENT_SEARCH_API_CLIENT_ID")?.trim();
  const clientSecret = getEnv("AUSTRALIAN_PATENT_SEARCH_API_CLIENT_SECRET")?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function trademarkCreds(): Creds | null {
  const clientId = getEnv("AUSTRALIAN_TRADE_MARK_SEARCH_CLIENT_ID")?.trim();
  const clientSecret = getEnv("AUSTRALIAN_TRADE_MARK_SEARCH_CLIENT_SECRET")?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function hasPatentCreds(): boolean {
  return patentCreds() !== null;
}

export function hasTrademarkCreds(): boolean {
  return trademarkCreds() !== null;
}

// Bearer-token cache keyed by client_id. Refresh ~60s before the token expires so
// an in-flight request never races the expiry boundary.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken({ clientId, clientSecret }: Creds): Promise<string> {
  const cached = tokenCache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
    timeoutMs: 30_000,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`IP Australia token error (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  tokenCache.set(clientId, { token: data.access_token, expiresAt: Date.now() + ttlMs - 60_000 });
  return data.access_token;
}

async function iaFetch<T>(
  base: string,
  creds: Creds,
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getAccessToken(creds);
  const res = await fetchWithTimeout(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    timeoutMs: 30_000,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`IP Australia error (${res.status}): ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// ---- Patents ----

export async function searchPatents(args: {
  query: string;
  searchType?: "ID" | "DETAILS";
  pageSize?: number;
  pageNumber?: number;
}) {
  const creds = patentCreds();
  if (!creds) throw new Error("Patent credentials not configured");
  const searchType = args.searchType ?? "DETAILS";
  const body: Record<string, unknown> = { query: args.query, searchType };
  if (searchType === "DETAILS") {
    body.pageSize = Math.min(args.pageSize ?? 10, 50);
    body.pageNumber = args.pageNumber ?? 0;
  }
  const data = await iaFetch<{ totalHits?: number; results?: unknown }>(
    PATENT_BASE,
    creds,
    "/search/quick",
    { method: "POST", body: JSON.stringify(body) }
  );
  return {
    query: args.query,
    searchType,
    totalHits: data.totalHits ?? 0,
    results: data.results ?? [],
  };
}

export async function getPatent(id: string) {
  const creds = patentCreds();
  if (!creds) throw new Error("Patent credentials not configured");
  const p = await iaFetch<Record<string, unknown>>(
    PATENT_BASE,
    creds,
    `/patent/${encodeURIComponent(id)}`
  );
  const biblio = (p.bibliographicData ?? {}) as Record<string, unknown>;
  return {
    applicationNumber: biblio.applicationNumber ?? null,
    inventionTitle: biblio.inventionTitle ?? null,
    applicants: p.applicant ?? null,
    inventors: p.inventors ?? null,
    owners: p.owners ?? null,
    filedDate: p.filedDate ?? null,
    priorityDate: p.priorityDate ?? null,
    expiryDate: p.expiryDate ?? null,
    ipRightStatusCode: p.ipRightStatusCode ?? null,
    pctDetails: p.pctDetails ?? null,
  };
}

// ---- Trade marks ----

export async function searchTrademarks(args: {
  query: string;
  status?: string[];
  changedSinceDate?: string;
}) {
  const creds = trademarkCreds();
  if (!creds) throw new Error("Trade mark credentials not configured");
  const body: Record<string, unknown> = { query: args.query };
  if (args.status?.length) body.filters = { status: args.status };
  if (args.changedSinceDate) body.changedSinceDate = args.changedSinceDate;
  const data = await iaFetch<{ count?: number; trademarkIds?: string[] }>(
    TRADEMARK_BASE,
    creds,
    "/search/quick",
    { method: "POST", body: JSON.stringify(body) }
  );
  return { query: args.query, count: data.count ?? 0, trademarkIds: data.trademarkIds ?? [] };
}

export async function getTrademark(id: string) {
  const creds = trademarkCreds();
  if (!creds) throw new Error("Trade mark credentials not configured");
  const t = await iaFetch<Record<string, unknown>>(
    TRADEMARK_BASE,
    creds,
    `/trade-mark/${encodeURIComponent(id)}`
  );
  return {
    number: t.number ?? null,
    words: t.words ?? null,
    kind: t.kind ?? null,
    statusCode: t.statusCode ?? null,
    statusDetail: t.statusDetail ?? null,
    statusGroup: t.statusGroup ?? null,
    owner: t.owner ?? null,
    goodsAndServices: t.goodsAndServices ?? null,
    filingDate: t.filingDate ?? null,
    priorityDate: t.priorityDate ?? null,
    renewalDueDate: t.renewalDueDate ?? null,
  };
}
