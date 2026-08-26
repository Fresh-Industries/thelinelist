"use client";

/**
 * Future paid placement. Rendered beside organic results, never inside
 * `filterPlants()` / card ranking.
 */
import { track } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import Link from "next/link";

type SlotPosition = "directory-top" | "homepage" | "company";

export function SponsoredSlot({ position }: { position: SlotPosition }) {
  function onCta() {
    track(ANALYTICS_EVENTS.featured_slot_cta_click, { position });
  }

  return (
    <aside className="sponsored-slot featured-slot" data-slot={position} aria-label="Featured listing">
      <p className="label">Featured</p>
      <p>
        No featured listing here yet. Claim your profile or ask about a featured slot. Featured
        placements stay outside the A to Z directory order.
      </p>
      <p className="featured-actions">
        <Link className="btn btn-ghost" href="/claim-submit" onClick={onCta}>
          Claim your profile
        </Link>
        <a
          className="btn btn-gold"
          href="mailto:hello@thelinelist.com?subject=Featured%20listing%20on%20The%20Line%20List"
          onClick={onCta}
        >
          Ask about featuring
        </a>
      </p>
    </aside>
  );
}
