import { LAST_CHECKED_LABEL } from "@/lib/site";
import Link from "next/link";

export function GuideByline({ reviewed = LAST_CHECKED_LABEL }: { reviewed?: string }) {
  return (
    <p className="guide-byline">
      By <Link href="/about">The Line List editorial team</Link> · Public sources reviewed {reviewed} · <Link href="/how-we-verify">Sourcing methodology</Link>
    </p>
  );
}
