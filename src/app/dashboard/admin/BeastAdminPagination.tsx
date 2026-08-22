"use client";

export const BEAST_ADMIN_PAGE_SIZE = 20;

export function BeastAdminPagination({
  page,
  pageSize = BEAST_ADMIN_PAGE_SIZE,
  totalItems,
  itemLabel = "records",
  onPageChange,
}: {
  page: number;
  pageSize?: number;
  totalItems: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label={`${itemLabel} pagination`}
    >
      <p className="text-sm font-bold text-slate-300" aria-live="polite">
        {totalItems
          ? `Showing ${firstItem}–${lastItem} of ${totalItems} ${itemLabel}`
          : `No ${itemLabel}`}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="beast-button-secondary min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </button>
          <span className="min-w-20 text-center text-xs font-black text-slate-300">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            className="beast-button-secondary min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </nav>
  );
}
