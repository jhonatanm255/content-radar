import React, { useId } from 'react';

interface SparklineProps {
  color?: string;
  /** Puntos Y normalizados 0–20 (viewBox height) */
  points?: number[];
  className?: string;
  showFill?: boolean;
}

function buildSmoothPath(points: number[]): string {
  if (points.length < 2) return '';
  const step = 100 / (points.length - 1);
  let d = `M0,${points[0]}`;
  for (let i = 1; i < points.length; i++) {
    const x = i * step;
    const prevX = (i - 1) * step;
    const cpx = prevX + step / 2;
    d += ` Q${cpx},${points[i - 1]} ${x},${points[i]}`;
  }
  return d;
}

function buildAreaPath(points: number[], height = 20): string {
  const line = buildSmoothPath(points);
  if (!line) return '';
  return `${line} L100,${height} L0,${height} Z`;
}

const DEFAULT_POINTS = [16, 14, 12, 13, 9, 6, 4];

export const Sparkline: React.FC<SparklineProps> = ({
  color = '#6366f1',
  points = DEFAULT_POINTS,
  className = 'h-8 w-full',
  showFill = true,
}) => {
  const gradientId = useId();

  return (
    <svg className={className} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
      {showFill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {showFill && (
        <path d={buildAreaPath(points)} fill={`url(#${gradientId})`} />
      )}
      <path
        d={buildSmoothPath(points)}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
