import { isNewsletterEnabled } from "@/lib/newsletter/config";
import { LAST_CHECKED_LABEL } from "@/lib/site";
import Link from "next/link";

export function SiteFooter() {
  const newsletterOn = isNewsletterEnabled();

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">The Line List</p>
          <p>
            Fresh Industries. A public directory of verified U.S. food and beverage manufacturers.
            Facts come from plant sites. Inclusion is not an endorsement.
          </p>
        </div>
        <ul className="trust-list">
          <li>Plant-site-verified facts</li>
          <li>No paywall</li>
          <li>No sales call from us</li>
        </ul>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/about#verify">How we verify</Link>
          <Link href="/learn">Learn</Link>
          <a href="mailto:hello@thelinelist.com">Contact</a>
          <Link href="/about#claim">Claim your profile</Link>
          {newsletterOn ? <Link href="/#newsletter">Newsletter</Link> : null}
        </nav>
      </div>
      <div className="wrap footer-meta">
        <p>
          Plant pages last checked {LAST_CHECKED_LABEL}. We quote what plants print. Blank fields
          stay unpublished.
        </p>
      </div>
    </footer>
  );
}
