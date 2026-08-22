import { FindManufacturerCta } from "@/components/FindManufacturerCta";
import { isNewsletterEnabled } from "@/lib/newsletter/config";
import Image from "next/image";
import Link from "next/link";

type NavMatch = "directory" | "learn" | "glossary" | "newsletter";

const BASE_NAV: { href: string; label: string; match: NavMatch }[] = [
  { href: "/copackers", label: "Find manufacturers", match: "directory" },
  { href: "/learn", label: "Learn", match: "learn" },
  { href: "/glossary", label: "Glossary", match: "glossary" },
];

function navCurrent(match: NavMatch, current?: string): boolean {
  switch (match) {
    case "directory":
      return current === "/copackers" || Boolean(current?.startsWith("/copackers/"));
    case "learn":
      return current === "/learn" || Boolean(current?.startsWith("/guides/"));
    case "glossary":
      return current === "/glossary";
    case "newsletter":
      return false;
    default: {
      const _exhaustive: never = match;
      return _exhaustive;
    }
  }
}

export function SiteHeader({ current }: { current?: string }) {
  const nav = isNewsletterEnabled()
    ? [...BASE_NAV, { href: "/#newsletter", label: "Newsletter", match: "newsletter" as const }]
    : BASE_NAV;

  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <Link className="wordmark" href="/" aria-current={current === "/" ? "page" : undefined}>
          <Image className="brand-mark" src="/brand/mark.svg" alt="" width={36} height={36} />
          <span className="brand-text">
            The Line List
            <span>Verified U.S. food makers</span>
          </span>
        </Link>
        <details className="nav-menu">
          <summary>Menu</summary>
          <nav className="site-nav" aria-label="Primary">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={navCurrent(item.match, current) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <FindManufacturerCta className="btn btn-gold header-cta" />
          </nav>
        </details>
        <nav className="site-nav site-nav-desktop" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={navCurrent(item.match, current) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <FindManufacturerCta className="btn btn-gold header-cta" />
        </nav>
      </div>
    </header>
  );
}
