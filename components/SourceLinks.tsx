import type { SourceLink } from "@/lib/directory";

export function SourceLinks({ links }: { links: SourceLink[] }) {
  return (
    <>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? " · " : null}
          <a href={link.href} rel="noreferrer">
            {link.label}
          </a>
        </span>
      ))}
    </>
  );
}
