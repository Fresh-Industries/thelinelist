import { LAST_CHECKED_LABEL } from "@/lib/site";
import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <Image
            className="footer-logo"
            src="/brand/line-list-logo.webp"
            alt="The Line List"
            width={640}
            height={315}
          />
          <p>
            A Fresh Industries project. Find food and beverage manufacturers and learn how to
            prepare for production. Inclusion is not an endorsement.
          </p>
        </div>
        <ul className="trust-list">
          <li>Sourced listing fields</li>
          <li>Unknowns stay visible</li>
          <li>Food and beverage only</li>
        </ul>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/how-we-verify">How we verify</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/newsletter">Newsletter</Link>
          <Link href="/find-manufacturers">Find manufacturers</Link>
          <a href="mailto:hello@thelinelist.com">Contact</a>
          <Link href="/claim-submit">Claim or submit a plant</Link>
          <Link href="/for-manufacturers">For manufacturers</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="wrap footer-meta">
        <p>
          Listings last reviewed {LAST_CHECKED_LABEL}. Blank fields show as not publicly listed.
        </p>
      </div>
    </footer>
  );
}
