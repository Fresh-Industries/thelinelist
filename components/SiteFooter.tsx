import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">The Line List</p>
          <p>Fresh Industries. Public facts from plant sites. Working site, not a live product claim.</p>
        </div>
        <ul className="trust-list">
          <li>Verified public info only</li>
          <li>No paywalls</li>
          <li>No sales calls</li>
        </ul>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/about#verify">How We Verify</Link>
          <Link href="/learn">Learn</Link>
          <Link href="mailto:hello@thelinelist.com">Contact</Link>
        </nav>
      </div>
      <div className="wrap footer-meta">
        <p>
          Last verified 21 Aug 2026 from plant and OEM pages fetched that day.
          Search volume: unpublished — we did not invent one.
        </p>
      </div>
    </footer>
  );
}
