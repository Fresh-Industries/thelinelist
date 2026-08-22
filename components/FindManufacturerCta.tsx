"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import Link from "next/link";
import type { ReactNode } from "react";

export function FindManufacturerCta({
  className,
  children = "Find a Manufacturer",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      className={className}
      href="/copackers"
      onClick={() => track(ANALYTICS_EVENTS.cta_find_manufacturer_click)}
    >
      {children}
    </Link>
  );
}
