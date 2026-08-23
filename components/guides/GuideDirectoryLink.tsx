"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import Link from "next/link";

export function GuideDirectoryLink({ href, label, guide }: { href: string; label: string; guide: string }) {
  return <Link className="btn btn-gold" href={href} onClick={() => track(ANALYTICS_EVENTS.guide_to_directory_click, { guide })}>{label}</Link>;
}
