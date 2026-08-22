"use client";

import { track } from "@/lib/analytics/client";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { useEffect } from "react";

export function TrackOnMount({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: Record<string, string | number | boolean | undefined>;
}) {
  useEffect(() => {
    track(event, props);
    // Fire once per mount for this event + slug pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only beacon
  }, [event]);
  return null;
}
