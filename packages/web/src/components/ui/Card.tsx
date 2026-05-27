import { cn } from '@/utils/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}
