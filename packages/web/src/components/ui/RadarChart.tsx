import { useMemo, useCallback } from 'react';

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
  onClick?: (dimension: RadarDimension) => void;
  highlightedDimension?: string;
}

export function RadarChart({
  dimensions,
  size = 300,
  fillColor = 'rgba(79, 70, 229, 0.15)',
  strokeColor = '#4f46e5',
  labelColor = '#374151',
  gridColor = '#e5e7eb',
  className,
  onClick,
  highlightedDimension,
}: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const levels = 5;

  const points = useMemo(() => {
    const angleStep = (2 * Math.PI) / dimensions.length;
    return dimensions.map((dim, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = dim.score > 0 ? (dim.score / 100) * radius : 0;
      return {
        x: dim.score > 0 ? center + r * Math.cos(angle) : center,
        y: dim.score > 0 ? center + r * Math.sin(angle) : center,
        labelX: center + (radius + 20) * Math.cos(angle),
        labelY: center + (radius + 20) * Math.sin(angle),
        label: dim.label,
        score: dim.score,
      };
    });
  }, [dimensions, center, radius]);

  const hasAnyScore = dimensions.some((d) => d.score > 0);
  const effectiveFillColor = hasAnyScore ? fillColor : 'rgba(156, 163, 175, 0.1)';
  const effectiveStrokeColor = hasAnyScore ? strokeColor : '#9ca3af';
  const effectiveStrokeDash = hasAnyScore ? undefined : '4,4';

  const handlePointClick = useCallback(
    (dim: RadarDimension) => {
      onClick?.(dim);
    },
    [onClick],
  );

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
        fill={effectiveFillColor}
        stroke={effectiveStrokeColor}
        strokeWidth={2}
        strokeDasharray={effectiveStrokeDash}
      />
      {/* Data points */}
      {points.map((p, i) => {
        const isHighlighted = highlightedDimension === p.label;
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isHighlighted ? 7 : p.score > 0 ? 4 : 4}
              fill={isHighlighted ? '#f59e0b' : p.score > 0 ? strokeColor : '#9ca3af'}
              stroke={isHighlighted ? '#d97706' : p.score > 0 ? 'none' : '#6b7280'}
              strokeWidth={isHighlighted ? 2 : p.score > 0 ? 0 : 1.5}
              strokeDasharray={p.score > 0 ? 'none' : '2,2'}
              className={onClick ? 'cursor-pointer' : ''}
              onClick={() => onClick && handlePointClick(dimensions[i])}
            >
              <title>{p.label}: {p.score}分</title>
            </circle>
            {isHighlighted && (
              <circle
                cx={p.x}
                cy={p.y}
                r={12}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="2,2"
                opacity={0.5}
              />
            )}
          </g>
        );
      })}
      {/* Labels */}
      {points.map((p, i) => {
        const angle = (i * 2 * Math.PI) / dimensions.length - Math.PI / 2;
        const isHighlighted = highlightedDimension === p.label;
        const isRight = Math.cos(angle) > 0.1;
        const isLeft = Math.cos(angle) < -0.1;
        const isTop = Math.sin(angle) < -0.3;
        const isBottom = Math.sin(angle) > 0.3;
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (isRight) anchor = 'start';
        if (isLeft) anchor = 'end';
        let dyValue = 0.35;
        if (isTop) dyValue = -0.5;
        if (isBottom) dyValue = 1;
        const dy = `${dyValue}em`;
        const scoreDy = `${dyValue + (isTop ? -0.8 : isBottom ? 1.2 : 1)}em`;
        return (
          <g key={`label-${i}`}>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={isHighlighted ? '#d97706' : labelColor}
              fontSize={isHighlighted ? '12' : '11'}
              fontWeight={isHighlighted ? '700' : '500'}
              dy={dy}
              className={onClick ? 'cursor-pointer' : ''}
              onClick={() => onClick && handlePointClick(dimensions[i])}
            >
              {p.label}
            </text>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={p.score > 0 ? strokeColor : '#9ca3af'}
              fontSize="10"
              fontWeight="600"
              dy={scoreDy}
            >
              {p.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
