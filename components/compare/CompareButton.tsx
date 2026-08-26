"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useEffect, useState } from "react";

const STORAGE_KEY = "the-line-list:comparison:v1";
const CHANGE_EVENT = "the-line-list:comparison-change";
const MAX_PLANTS = 5;
let fallbackComparison: string[] = [];
let storageAvailable = true;

export function readComparison(): string[] {
  if (typeof window === "undefined") return [];
  if (!storageAvailable) return fallbackComparison;
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    fallbackComparison = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_PLANTS) : [];
    return fallbackComparison;
  } catch {
    storageAvailable = false;
    return fallbackComparison;
  }
}

function writeComparison(slugs: string[]) {
  fallbackComparison = slugs.slice(0, MAX_PLANTS);
  if (storageAvailable) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackComparison));
    } catch {
      storageAvailable = false;
    }
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function comparisonHref(slugs: string[]): string {
  return slugs.length > 0 ? `/find-manufacturers/compare?plants=${encodeURIComponent(slugs.join(","))}` : "/find-manufacturers/compare";
}

export function CompareButton({ slug, name, className = "compare-toggle" }: { slug: string; name: string; className?: string }) {
  const [selected, setSelected] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    function sync() {
      const slugs = readComparison();
      setSelected(slugs.includes(slug));
      setFull(slugs.length >= MAX_PLANTS && !slugs.includes(slug));
    }
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  return (
    <button
      type="button"
      className={`${className}${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${name} from comparison` : full ? `Comparison is full; ${name} cannot be added` : `Compare ${name}`}
      disabled={full}
      title={full ? "You can compare up to five manufacturers" : undefined}
      onClick={() => {
        const current = readComparison();
        const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug].slice(0, MAX_PLANTS);
        writeComparison(next);
        track(current.includes(slug) ? ANALYTICS_EVENTS.comparison_removed : ANALYTICS_EVENTS.comparison_added, { slug, count: next.length });
      }}
    >
      <span aria-hidden="true">{selected ? "☑" : "□"}</span>{" "}
      {selected ? "Selected" : full ? "Comparison full" : "Compare"}
    </button>
  );
}

export { CHANGE_EVENT, MAX_PLANTS, STORAGE_KEY, writeComparison };
