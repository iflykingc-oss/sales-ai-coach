import { useMemo } from 'react';

export interface RadarDimension {
  label: string;
  score: number; // 0-100
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  labelColor?: string;
  gridColor?: string;
  className?: string;
}

export function RadarChart({
  dimensions,
  size = 300,
  fillColor = 'rgba(79, 70, 229, 0.15)',
  strokeColor = '#4f46e5',
  labelColor = '#374151',
  gridColor = '#e5e7eb',
  className,
}: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const levels = 5;

  const points = useMemo(() => {
    const angleStep = (2 * Math.PI) / dimensions.length;
    return dimensions.map((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (dim.score / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        labelX: center + (radius + 20) * Math.cos(angle),
        labelY: center + (radius + 20) * Math.sin(angle),
        label: dim.label,
        score: dim.score,
      };
    });
  }, [dimensions, center, radius]);

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const gridLevels = useMemo(() => {
    const angleStep = (2 * Math.PI) / dimensions.length;
    return Array.from({ length: levels }, (_, level) => {
      const r = ((level + 1) / levels) * radius;
      const pts = dimensions.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      });
      return { points: pts.join(' '), level: level + 1 };
    });
  }, [dimensions.length, center, radius]);

  const axisLines = useMemo(() => {
    const angleStep = (2 * Math.PI) / dimensions.length;
    return dimensions.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        x1: center,
        y1: center,
        x2: center + radius * Math.cos(angle),
        y2: center + radius * Math.sin(angle),
      };
    });
  }, [dimensions.length, center, radius]);

  return (
    <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid levels */}
      {gridLevels.map((g) => (
        <polygon
          key={g.level}
          points={g.points}
          fill="none"
          stroke={gridColor}
          strokeWidth={1}
          strokeDasharray={g.level === levels ? 'none' : '2,2'}
        />
      ))}
      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
      />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={strokeColor} />
      ))}
      {/* Labels */}
      {points.map((p, i) => {
        const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
        const isRight = Math.cos(angle) > 0.1;
        const isLeft = Math.cos(angle) < -0.1;
        const isTop = Math.sin(angle) < -0.3;
        const isBottom = Math.sin(angle) > 0.3;
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (isRight) anchor = 'start';
        if (isLeft) anchor = 'end';
        let dy = '0.35em';
        if (isTop) dy = '-0.5em';
        if (isBottom) dy = '1em';
        return (
          <g key={`label-${i}`}>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={labelColor}
              fontSize="11"
              fontWeight="500"
              dy={dy}
            >
              {p.label}
            </text>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={strokeColor}
              fontSize="10"
              fontWeight="600"
              dy={Number(dy) + (isTop ? -0.8 : isBottom ? 1.2 : 1)}
            >
              {p.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
