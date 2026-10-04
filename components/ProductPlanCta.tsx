"use client";

import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import Link from "next/link";
import type { ReactNode } from "react";

export function ProductPlanCta({
  className,
  source,
  children = "Start my product plan",
}: {
  className?: string;
  source: "home_hero" | "home_how_it_works";
  children?: ReactNode;
}) {
  return (
    <Link
      className={className}
      href="/sourcing"
      onClick={() => track(ANALYTICS_EVENTS.cta_product_plan_click, { source })}
    >
      {children}
    </Link>
  );
}
