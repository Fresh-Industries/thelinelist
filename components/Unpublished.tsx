export function Unpublished({ children = "Unknown, ask the manufacturer" }: { children?: string }) {
  return <span className="unpublished">{children}</span>;
}
