"use client";

import { ANALYTICS_EVENTS, type AnalyticsEvent } from "./events";

type AnalyticsProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const payload = compactProps(props);
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;

  switch (provider) {
    case "plausible":
      window.plausible?.(event, payload ? { props: payload } : undefined);
      return;
    case "posthog":
      window.posthog?.capture(event, payload);
      return;
    case "console":
      console.info("[analytics]", event, payload ?? {});
      return;
    case undefined:
    case "":
      if (process.env.NODE_ENV === "development") {
        console.info("[analytics:noop]", event, payload ?? {});
      }
      return;
    default: {
      const _exhaustive: never = provider as never;
      void _exhaustive;
      if (process.env.NODE_ENV === "development") {
        console.info("[analytics:unknown-provider]", provider, event);
      }
    }
  }
}

export function trackSearch(props?: AnalyticsProps): void {
  track(ANALYTICS_EVENTS.manufacturer_search, props);
}

export function trackFilter(props?: AnalyticsProps): void {
  track(ANALYTICS_EVENTS.filter_applied, props);
}

function compactProps(
  props?: AnalyticsProps,
): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) next[key] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
