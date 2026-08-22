import Link from "next/link";

const NAV = [
  { href: "/copackers", label: "Directory" },
  { href: "/guides/hpp", label: "HPP" },
  { href: "/guides/hot-fill", label: "Hot fill" },
  { href: "/guides/retort", label: "Retort" },
  { href: "/guides/small-moq", label: "Small MOQ" },
  { href: "/guides/sauce", label: "Sauces" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="wordmark" href="/" aria-current={current === "/" ? "page" : undefined}>
          The Line List
          <span>Fresh Industries</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
