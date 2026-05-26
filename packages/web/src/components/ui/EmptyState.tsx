import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  shortcut?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, action, shortcut, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12', className)}>
      <div className="mb-4 rounded-full bg-gray-100 p-3 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-gray-500">{description}</p>
      {action && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={action.onClick}>{action.label}</Button>
          {shortcut && (
            <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-500 sm:inline-block">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
}
