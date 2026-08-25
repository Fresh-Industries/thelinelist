import type { SourceLink } from "@/lib/directory";

export function SourceLinks({ links, numbered = false }: { links: SourceLink[]; numbered?: boolean }) {
  return (
    <>
      {links.map((link, index) => (
        <span key={link.href} id={numbered ? `source-${index + 1}` : undefined}>
          {index > 0 ? " · " : null}
          <a href={link.href} rel="noreferrer">
            {numbered ? `${index + 1}. ${link.label}` : link.label}
          </a>
        </span>
      ))}
    </>
  );
}
