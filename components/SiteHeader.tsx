import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "/copackers", label: "Find Manufacturers", match: "directory" },
  { href: "/learn", label: "Learn", match: "learn" },
  { href: "/glossary", label: "Resources", match: "resources" },
  { href: "/#newsletter", label: "Newsletter", match: "newsletter" },
] as const;

function navCurrent(match: (typeof NAV)[number]["match"], current?: string): boolean {
  switch (match) {
    case "directory":
      return current === "/copackers" || Boolean(current?.startsWith("/copackers/"));
    case "learn":
      return current === "/learn" || Boolean(current?.startsWith("/guides/"));
    case "resources":
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
  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <Link className="wordmark" href="/" aria-current={current === "/" ? "page" : undefined}>
          <Image className="brand-mark" src="/brand/mark.svg" alt="" width={36} height={36} />
          <span className="brand-text">
            The Line List
            <span>From idea to shelf</span>
          </span>
        </Link>
        <details className="nav-menu">
          <summary>Menu</summary>
          <nav className="site-nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={navCurrent(item.match, current) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link className="btn btn-gold header-cta" href="/about#intro">
              Get Started
            </Link>
          </nav>
        </details>
        <nav className="site-nav site-nav-desktop" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={navCurrent(item.match, current) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link className="btn btn-gold header-cta" href="/about#intro">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
