import { JWT } from "google-auth-library";
import { logger } from "./logger";

const GSC_LOG = logger.child({ lib: "gsc-client" });

const SEARCH_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export interface GscCredentials {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
}

export interface GscSummary {
  configured: true;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  startDate: string;
  endDate: string;
}

export interface GscNotConfigured {
  configured: false;
  reason: string;
}

export type GscResult = GscSummary | GscNotConfigured;

export interface GscTopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscTopQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscDetailResult extends GscSummary {
  topPages: GscTopPage[];
  topQueries: GscTopQuery[];
}

function getCredentials(): GscCredentials | null {
  const clientEmail = process.env.GSC_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GSC_PRIVATE_KEY?.trim()
    ?.replace(/\\n/g, "\n");
  const siteUrl = process.env.GSC_SITE_URL?.trim();

  if (!clientEmail || !privateKey || !siteUrl) {
    return null;
  }
  return { clientEmail, privateKey, siteUrl };
}

function makeDateRange(days = 28): { startDate: string; endDate: string } {
  const end = new Date();
  // GSC has a 2-3 day data lag — offset the window so we don't show
  // empty trailing days that look like a data gap.
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function getAccessToken(creds: GscCredentials): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [SEARCH_ANALYTICS_SCOPE],
  });
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to obtain GSC access token");
  return token.token;
}

async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<{ rows?: Array<Record<string, unknown>>; responseAggregationType?: string }> {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/v1/sites/${encodedSite}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC API error ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json() as Promise<{ rows?: Array<Record<string, unknown>> }>;
}

export async function fetchGscSummary(days = 28): Promise<GscResult> {
  const creds = getCredentials();
  if (!creds) {
    return {
      configured: false,
      reason:
        "GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, and GSC_SITE_URL environment variables are not set.",
    };
  }

  const { startDate, endDate } = makeDateRange(days);

  try {
    const token = await getAccessToken(creds);

    const data = await querySearchAnalytics(token, creds.siteUrl, {
      startDate,
      endDate,
      type: "web",
    });

    const row = (data.rows?.[0] ?? {}) as {
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    };

    return {
      configured: true,
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
      startDate,
      endDate,
    };
  } catch (err) {
    GSC_LOG.error({ err }, "GSC summary fetch failed");
    throw err;
  }
}

export async function fetchGscDetail(days = 28): Promise<GscDetailResult | GscNotConfigured> {
  const creds = getCredentials();
  if (!creds) {
    return {
      configured: false,
      reason:
        "GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, and GSC_SITE_URL environment variables are not set.",
    };
  }

  const { startDate, endDate } = makeDateRange(days);

  try {
    const token = await getAccessToken(creds);

    const [summaryData, pagesData, queriesData] = await Promise.all([
      querySearchAnalytics(token, creds.siteUrl, {
        startDate,
        endDate,
        type: "web",
      }),
      querySearchAnalytics(token, creds.siteUrl, {
        startDate,
        endDate,
        type: "web",
        dimensions: ["page"],
        rowLimit: 10,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      }),
      querySearchAnalytics(token, creds.siteUrl, {
        startDate,
        endDate,
        type: "web",
        dimensions: ["query"],
        rowLimit: 10,
        orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
      }),
    ]);

    type AggRow = { clicks?: number; impressions?: number; ctr?: number; position?: number };
    type DimRow = AggRow & { keys?: string[] };

    const summary = (summaryData.rows?.[0] ?? {}) as AggRow;

    const topPages: GscTopPage[] = ((pagesData.rows ?? []) as DimRow[]).map((r) => ({
      page: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));

    const topQueries: GscTopQuery[] = ((queriesData.rows ?? []) as DimRow[]).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));

    return {
      configured: true,
      clicks: summary.clicks ?? 0,
      impressions: summary.impressions ?? 0,
      ctr: summary.ctr ?? 0,
      position: summary.position ?? 0,
      startDate,
      endDate,
      topPages,
      topQueries,
    };
  } catch (err) {
    GSC_LOG.error({ err }, "GSC detail fetch failed");
    throw err;
  }
}
