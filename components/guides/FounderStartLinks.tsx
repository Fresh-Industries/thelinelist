import Link from "next/link";
import { FOUNDER_STAGES } from "@/lib/sourcing/preparation";

export function FounderStartLinks() {
  return <section className="founder-start-links" aria-labelledby="founder-stage-heading"><div className="section-head"><div><p className="kicker">Find your next step</p><h2 id="founder-stage-heading">Where are you starting?</h2></div><Link href="/sourcing">Start your product plan <span aria-hidden="true">→</span></Link></div>
    <div className="founder-stage-links">{FOUNDER_STAGES.map((stage) => <Link key={stage.value} href={stage.guide}><h3>{stage.label}</h3><p>{stage.description}</p><span>Read the guide <span aria-hidden="true">→</span></span></Link>)}</div>
    <p className="founder-tool-link">Working through the numbers? <Link href="/guides/first-run-costs">Try the first-run cost worksheet</Link>.</p>
  </section>;
}
