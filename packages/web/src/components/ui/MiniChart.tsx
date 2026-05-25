import { cn } from '@/utils/cn';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = '#6366f1', className }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-grad-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  width?: number;
  height?: number;
  maxValue?: number;
  className?: string;
  showValues?: boolean;
}

export function MiniBarChart({ data, width = 200, height = 100, maxValue, className, showValues = true }: BarChartProps) {
  if (data.length === 0) return null;

  const max = maxValue ?? (Math.max(...data.map((d) => d.value)) || 1);
  const barWidth = (width - 8) / data.length;
  const chartHeight = height - 24; // leave room for labels

  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)}>
      {data.map((d, i) => {
        const barH = (d.value / max) * chartHeight;
        const x = i * barWidth + 4;
        const y = chartHeight - barH + 4;
        const barColor = d.color ?? '#6366f1';

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth - 8}
              height={barH}
              rx="3"
              fill={barColor}
              opacity="0.85"
            />
            {showValues && (
              <text
                x={x + (barWidth - 8) / 2}
                y={y - 2}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {d.value}
              </text>
            )}
            <text
              x={x + (barWidth - 8) / 2}
              y={height}
              textAnchor="middle"
              fontSize="8"
              fill="#9ca3af"
            >
              {d.label.length > 4 ? d.label.slice(0, 4) : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface RadarChartProps {
  data: { label: string; value: number }[];
  size?: number;
  maxValue?: number;
  className?: string;
  fillColor?: string;
  strokeColor?: string;
}

export function RadarChart({ data, size = 160, maxValue, className, fillColor = 'rgba(99,102,241,0.15)', strokeColor = '#6366f1' }: RadarChartProps) {
  if (data.length < 3) return null;

  const max = maxValue ?? (Math.max(...data.map((d) => d.value)) || 1);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / max) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} className={cn('overflow-visible', className)}>
      {/* Grid */}
      {gridLevels.map((level) => {
        const gridPoints = Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, level * max);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={gridPoints}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {/* Axis lines */}
      {data.map((_, i) => {
        const p = getPoint(i, max);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      {(() => {
        const pts = data.map((d, i) => {
          const p = getPoint(i, d.value);
          return `${p.x},${p.y}`;
        }).join(' ');
        return <polygon points={pts} fill={fillColor} stroke={strokeColor} strokeWidth="2" />;
      })()}

      {/* Labels */}
      {data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelRadius = radius + 14;
        const x = cx + labelRadius * Math.cos(angle);
        const y = cy + labelRadius * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {d.label}
          </text>
        );
      })}

      {/* Data points */}
      {data.map((d, i) => {
        const p = getPoint(i, d.value);
        return (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={strokeColor} />
        );
      })}
    </svg>
  );
}

// Stat card for dashboard metrics
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
