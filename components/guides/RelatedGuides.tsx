import type { RelatedGuideLink } from "@/lib/guides/related";
import Link from "next/link";

export function RelatedGuides({ guides, heading = "Learn before you contact a manufacturer" }: { guides: RelatedGuideLink[]; heading?: string }) {
  return (
    <section className="related-guide-band" aria-labelledby="related-guide-band-heading">
      <div><p className="kicker">Useful next step</p><h2 id="related-guide-band-heading">{heading}</h2></div>
      <div className="related-guide-grid">
        {guides.map((guide) => <Link key={guide.href} href={guide.href}><strong>{guide.title}</strong><span>{guide.description}</span><em>Read guide →</em></Link>)}
      </div>
    </section>
  );
}
