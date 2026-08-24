import Image from "next/image";
import Link from "next/link";

type NavMatch = "directory" | "guides" | "about" | "newsletter";

const BASE_NAV: { href: string; label: string; match: NavMatch }[] = [
  { href: "/find-manufacturers", label: "Find manufacturers", match: "directory" },
  { href: "/guides", label: "Guides", match: "guides" },
  { href: "/newsletter", label: "Newsletter", match: "newsletter" },
  { href: "/about", label: "About", match: "about" },
];

function navCurrent(match: NavMatch, current?: string): boolean {
  switch (match) {
    case "directory":
      return current === "/find-manufacturers" || Boolean(current?.startsWith("/find-manufacturers/")) || Boolean(current?.startsWith("/manufacturers/"));
    case "guides":
      return current === "/guides" || Boolean(current?.startsWith("/guides/"));
    case "about":
      return current === "/about" || current === "/how-we-verify";
    case "newsletter":
      return current === "/newsletter";
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
          <Image
            className="brand-logo"
            src="/brand/line-list-logo.png"
            alt="The Line List"
            width={1345}
            height={662}
            priority
            unoptimized
          />
        </Link>
        <details className="nav-menu">
          <summary>Menu</summary>
          <nav className="site-nav" aria-label="Primary mobile">
            {BASE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={navCurrent(item.match, current) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
        <nav className="site-nav site-nav-desktop" aria-label="Primary desktop">
          {BASE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={navCurrent(item.match, current) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
