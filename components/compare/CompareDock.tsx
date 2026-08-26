"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CHANGE_EVENT, comparisonHref, readComparison, writeComparison } from "./CompareButton";

export function CompareDock() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    function sync() { setSlugs(readComparison()); }
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (slugs.length === 0) return null;

  return (
    <aside className="compare-dock" aria-live="polite" aria-label="Manufacturer comparison">
      <div><strong>{slugs.length} selected</strong><span>{slugs.length < 2 ? "Select one more to compare." : slugs.length === 5 ? "Your shortlist is full." : "Ready to compare side by side."}</span></div>
      <div className="compare-dock-actions">
        <button type="button" onClick={() => writeComparison([])}>Clear</button>
        {slugs.length >= 2 ? <Link className="btn btn-gold" href={comparisonHref(slugs)} onClick={() => track(ANALYTICS_EVENTS.comparison_opened, { count: slugs.length })}>Compare now</Link> : <span className="compare-dock-waiting">Select 1 more</span>}
      </div>
    </aside>
  );
}
