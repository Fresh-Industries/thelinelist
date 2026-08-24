import { queryToSearchParams, type DirectoryQuery } from "@/lib/directory";
import Link from "next/link";

function pageHref(query: DirectoryQuery, page: number): string {
  const hasFilters = Boolean(
    query.product || query.category || query.process || query.smallMoq || query.moqDisclosed
      || query.packaging || query.certification || query.operationType || query.state || query.sort,
  );

  if (!hasFilters) return page === 1 ? "/find-manufacturers" : `/find-manufacturers/page/${page}`;
  const params = queryToSearchParams({ ...query, page: page === 1 ? undefined : page });
  return `/find-manufacturers?${params}`;
}

export function DirectoryPagination({ query, currentPage, pageCount }: {
  query: DirectoryQuery;
  currentPage: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav className="directory-pagination" aria-label="Manufacturer result pages">
      {currentPage > 1 ? <Link rel="prev" href={pageHref(query, currentPage - 1)}>← Previous</Link> : <span />}
      <ol>
        {pages.map((page) => (
          <li key={page}>
            <Link href={pageHref(query, page)} aria-current={page === currentPage ? "page" : undefined}>{page}</Link>
          </li>
        ))}
      </ol>
      {currentPage < pageCount ? <Link rel="next" href={pageHref(query, currentPage + 1)}>Next →</Link> : <span />}
    </nav>
  );
}
