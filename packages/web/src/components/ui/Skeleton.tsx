import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
}

Skeleton.Line = function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3 w-full', className)} />;
};

Skeleton.Heading = function SkeletonHeading({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-1/3', className)} />;
};

Skeleton.Card = function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4', className)}>
      <Skeleton.Heading className="mb-3" />
      <Skeleton.Line className="mb-2" />
      <Skeleton.Line className="mb-2 w-4/5" />
      <Skeleton.Line className="w-2/3" />
    </div>
  );
};

Skeleton.Table = function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[1, 2, 3, 4].map((j) => (
            <Skeleton key={j} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};
