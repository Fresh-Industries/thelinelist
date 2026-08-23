export function Unpublished({ children = "Not publicly listed" }: { children?: string }) {
  return <span className="unpublished">{children}</span>;
}
