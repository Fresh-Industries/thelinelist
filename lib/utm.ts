export const UTM_COOKIE = "ll_utm";
export const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const KEYS = ["source", "medium", "campaign", "content", "term"] as const;

export function parseUtmSearch(search: string): UtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return readUtmParams(params);
}

export function readUtmParams(params: URLSearchParams): UtmParams {
  const utm: UtmParams = {};
  for (const key of KEYS) {
    const value = params.get(`utm_${key}`)?.trim();
    if (value) {
      utm[key] = value.slice(0, 200);
    }
  }
  return utm;
}

export function parseUtmCookie(raw: string | undefined): UtmParams {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const utm: UtmParams = {};
    for (const key of KEYS) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) {
        utm[key] = value.trim().slice(0, 200);
      }
    }
    return utm;
  } catch {
    return {};
  }
}

export function mergeUtm(primary: UtmParams, fallback: UtmParams): UtmParams {
  return {
    source: primary.source ?? fallback.source,
    medium: primary.medium ?? fallback.medium,
    campaign: primary.campaign ?? fallback.campaign,
    content: primary.content ?? fallback.content,
    term: primary.term ?? fallback.term,
  };
}

export function utmFromForm(formData: FormData): UtmParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = String(formData.get(`utm_${key}`) ?? "").trim();
    if (value) params.set(`utm_${key}`, value);
  }
  return readUtmParams(params);
}

export function hasUtm(utm: UtmParams): boolean {
  return Boolean(utm.source || utm.medium || utm.campaign || utm.content || utm.term);
}
