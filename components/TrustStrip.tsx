import Link from "next/link";

export function TrustStrip() {
  return (
    <aside className="trust-strip wrap" aria-label="How listings work">
      <div>
        <span aria-hidden="true">✓</span>
        <p><strong>Sourced fields</strong>Capabilities appear only when a public source states them.</p>
      </div>
      <div>
        <span aria-hidden="true">?</span>
        <p><strong>Honest unknowns</strong>Missing details stay “Not publicly listed.”</p>
      </div>
      <div>
        <span aria-hidden="true">↗</span>
        <p><strong>Verify the fit</strong>Inclusion is not an endorsement.</p>
      </div>
      <Link href="/how-we-verify">How we verify</Link>
    </aside>
  );
}
