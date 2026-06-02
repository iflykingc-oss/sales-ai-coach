import { useState, useEffect, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// AnimatedCounter
// ============================================================================

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ target, duration = 1500, className, suffix, prefix }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return (
    <span className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}

// ============================================================================
// GradeBadge
// ============================================================================

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; glow: string; label: string }> = {
  S: { color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/30', label: '卓越' },
  A: { color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/30', label: '优秀' },
  B: { color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/30', label: '良好' },
  C: { color: 'from-orange-400 to-amber-500', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/30', label: '一般' },
  D: { color: 'from-red-400 to-rose-500', bg: 'bg-red-500/10', glow: 'shadow-red-500/30', label: '待改进' },
};

const SIZE_CLASSES = {
  sm: 'text-2xl p-3',
  md: 'text-4xl p-5',
  lg: 'text-6xl p-8',
};

export function GradeBadge({ grade, size = 'md', showLabel = true, className }: GradeBadgeProps) {
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.B;

  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'absolute inset-0 rounded-2xl blur-xl opacity-50',
        config.bg
      )} />
      <div className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-2xl border border-white/20 backdrop-blur-xl',
        'bg-gradient-to-br from-white/80 to-white/40',
        'shadow-xl',
        config.glow,
        SIZE_CLASSES[size]
      )}>
        <div className={cn(
          'font-black bg-gradient-to-br bg-clip-text text-transparent',
          config.color
        )}>
          {grade}
        </div>
        {showLabel && (
          <div className="mt-1 text-xs font-medium text-gray-500">
            {config.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// StatCard
// ============================================================================

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  color?: string;
  className?: string;
}

export function StatCard({ icon, label, value, trend, color = 'bg-primary-500', className }: StatCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-xl',
      'bg-gradient-to-br from-white/80 to-white/40 p-5',
      'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
      className
    )}>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            color
          )}>
            {icon}
          </div>
        )}
        {trend && (
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
            trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="mt-1 text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ============================================================================
// DimensionBar
// ============================================================================

interface DimensionBarProps {
  label: string;
  score: number;
  maxScore?: number;
  delay?: number;
  showScore?: boolean;
  className?: string;
}

export function DimensionBar({ label, score, maxScore = 100, delay = 0, showScore = true, className }: DimensionBarProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.round((score / maxScore) * 100);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  const getColor = (pct: number) => {
    if (pct >= 85) return 'from-emerald-400 to-green-500';
    if (pct >= 75) return 'from-blue-400 to-cyan-500';
    if (pct >= 70) return 'from-amber-400 to-yellow-500';
    return 'from-red-400 to-rose-500';
  };

  return (
    <div className={cn('group', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showScore && (
          <span className="text-sm font-bold text-gray-900">{score}</span>
        )}
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out',
            getColor(percentage)
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MetricCard
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-xl border border-gray-200 bg-white p-4',
      'transition-all duration-200 hover:shadow-md',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={cn(
            'flex items-center gap-0.5 text-sm font-medium',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

// ============================================================================
// ProgressBar
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const PROGRESS_COLORS = {
  default: 'from-primary-400 to-primary-600',
  success: 'from-emerald-400 to-green-600',
  warning: 'from-amber-400 to-yellow-600',
  danger: 'from-red-400 to-rose-600',
};

const PROGRESS_SIZES = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({ value, max = 100, color = 'default', size = 'md', showLabel = false, className }: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-600">{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-gray-100 overflow-hidden', PROGRESS_SIZES[size])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            PROGRESS_COLORS[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// TimelineItem
// ============================================================================

interface TimelineItemProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  time?: string;
  isActive?: boolean;
  isLast?: boolean;
  color?: string;
  className?: string;
}

export function TimelineItem({ icon, title, description, time, isActive, isLast, color = 'bg-primary-500', className }: TimelineItemProps) {
  return (
    <div className={cn('flex gap-4', className)}>
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          isActive ? color : 'bg-gray-200'
        )}>
          {icon || <Minus className="h-4 w-4 text-white" />}
        </div>
        {!isLast && (
          <div className="mt-2 h-full w-0.5 bg-gray-200" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            'font-medium',
            isActive ? 'text-gray-900' : 'text-gray-600'
          )}>
            {title}
          </h4>
          {time && (
            <span className="text-xs text-gray-400">{time}</span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DataGrid
// ============================================================================

interface DataGridProps {
  data: Array<Record<string, any>>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: any) => ReactNode;
  }>;
  className?: string;
}

export function DataGrid({ data, columns, className }: DataGridProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
