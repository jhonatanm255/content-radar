import React, { useId } from 'react';

interface MiniTrendSparklineProps {
  color?: string;
  variant?: 'up' | 'flat' | 'down';
}

const VARIANTS: Record<string, number[]> = {
  up: [18, 16, 14, 12, 10, 7, 4],
  flat: [14, 15, 13, 14, 13, 12, 13],
  down: [6, 8, 10, 12, 14, 16, 17],
};

export const MiniTrendSparkline: React.FC<MiniTrendSparklineProps> = ({
  color = '#22C55E',
  variant = 'up',
}) => {
  const gradientId = useId();
  const points = VARIANTS[variant];
  const step = 50 / (points.length - 1);
  let d = `M0,${points[0]}`;
  for (let i = 1; i < points.length; i++) {
    const x = i * step;
    const cpx = (i - 1) * step + step / 2;
    d += ` Q${cpx},${points[i - 1]} ${x},${points[i]}`;
  }
  const area = `${d} L50,20 L0,20 Z`;

  return (
    <svg className="w-14 h-7 mx-auto" viewBox="0 0 50 20" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
};
