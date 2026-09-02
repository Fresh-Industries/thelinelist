import { LISTINGS_LAST_REVIEWED_LABEL } from "@/lib/directory/review-date";
import Link from "next/link";

export function GuideByline({ reviewed = LISTINGS_LAST_REVIEWED_LABEL }: { reviewed?: string }) {
  return (
    <p className="guide-byline">
      By <Link href="/about">The Line List editorial team</Link> · Public sources reviewed {reviewed} · <Link href="/how-we-verify">Sourcing methodology</Link>
    </p>
  );
}
