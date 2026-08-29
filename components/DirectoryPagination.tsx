import { queryToSearchParams, type DirectoryQuery } from "@/lib/directory";

function pageHref(query: DirectoryQuery, page: number): string {
  const hasFilters = Boolean(
    query.product || query.category || query.process || query.smallMoq || query.smallRunSignal || query.moqDisclosed
      || query.packaging || query.certification || query.operationType || query.state || query.verified || query.sort,
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
      {currentPage > 1 ? <a rel="prev" href={pageHref(query, currentPage - 1)}>← Previous</a> : <span />}
      <ol>
        {pages.map((page) => (
          <li key={page}>
            <a href={pageHref(query, page)} aria-current={page === currentPage ? "page" : undefined}>{page}</a>
          </li>
        ))}
      </ol>
      {currentPage < pageCount ? <a rel="next" href={pageHref(query, currentPage + 1)}>Next →</a> : <span />}
    </nav>
  );
}
