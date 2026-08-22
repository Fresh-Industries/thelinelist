export function Unpublished({ children = "unpublished" }: { children?: string }) {
  return <span className="unpublished">{children}</span>;
}
