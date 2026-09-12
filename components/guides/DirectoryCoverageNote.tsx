import { filterPlants, getProductCategory } from "@/lib/directory";

export function DirectoryCoverageNote({ href }: { href: string }) {
  const slug = href.match(/^\/find-manufacturers\/([^/?]+)$/)?.[1];
  const category = slug ? getProductCategory(slug) : undefined;
  if (!category) return null;
  const count = filterPlants({ category: category.slug }).length;
  if (count > 5) return null;

  return (
    <p className="honest" data-directory-coverage>
      {count === 0
        ? `No manufacturers currently have public source support for ${category.label.toLowerCase()} in this directory.`
        : `The current shortlist has ${count} ${count === 1 ? "manufacturer" : "manufacturers"} that publicly mention ${category.label.toLowerCase()}.`}
      {" "}This reflects our sourced coverage. Confirm your exact product, package, and first-run amount with each manufacturer.
    </p>
  );
}
