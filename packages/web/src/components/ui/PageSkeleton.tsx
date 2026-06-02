import { cn } from '@/utils/cn';

interface PageSkeletonProps {
  className?: string;
  lines?: number;
  showHeader?: boolean;
  showCards?: boolean;
  cardCount?: number;
}

export function PageSkeleton({
  className,
  lines = 3,
  showHeader = true,
  showCards = false,
  cardCount = 3,
}: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header skeleton */}
      {showHeader && (
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-100" />
        </div>
      )}

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-gray-100"
            style={{ width: `${Math.max(60, 100 - i * 15)}%` }}
          />
        ))}
      </div>

      {/* Card skeletons */}
      {showCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 p-6', className)}>
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-gray-100 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 flex-1 animate-pulse rounded bg-gray-100"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
