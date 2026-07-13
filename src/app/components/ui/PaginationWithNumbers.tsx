import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';

interface PaginationWithNumbersProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function PaginationWithNumbers({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className,
}: PaginationWithNumbersProps) {
  if (totalPages <= 1) return null;

  const pageNumbers: (number | 'ellipsis')[] = (() => {
    if (totalPages <= 7) return range(1, totalPages);

    const pages: (number | 'ellipsis')[] = [1];

    if (currentPage > 3) pages.push('ellipsis');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push('ellipsis');

    pages.push(totalPages);
    return pages;
  })();

  return (
    <div className={cn('flex flex-col items-center gap-2 py-4', className)}>
      <div className="text-sm text-gray-500">
        {totalItems !== undefined
          ? `Page ${currentPage} of ${totalPages} (${totalItems} total)`
          : `Page ${currentPage} of ${totalPages}`}
      </div>
      <nav className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                p === currentPage
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
