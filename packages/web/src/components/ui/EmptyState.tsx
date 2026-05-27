import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  shortcut?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, action, secondaryAction, shortcut, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500',
      className,
    )}>
      <div className="mb-4 rounded-2xl bg-primary-50 p-4 text-primary-500 animate-bounce-in">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-center text-sm leading-relaxed text-gray-500">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.label}
              {shortcut && (
                <kbd className="hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] sm:inline-block">
                  {shortcut}
                </kbd>
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
