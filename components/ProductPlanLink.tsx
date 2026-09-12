"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { readActivePlanId, subscribeActivePlan } from "@/lib/sourcing/active-plan";

export function ProductPlanLink({ current }: { current?: boolean }) {
  const planId = useSyncExternalStore(subscribeActivePlan, readActivePlanId, () => null);
  return <Link href={planId ? `/sourcing/${planId}` : "/sourcing"} prefetch={false} aria-current={current ? "page" : undefined}>Your product plan</Link>;
}
