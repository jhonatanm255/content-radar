import React from 'react';

export interface DonutSegment {
  percentage: number;
  color: string;
}

interface DesignDonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub?: string;
  sizeClass?: string;
}

const RADIUS = 15.915;
const STROKE = 5.5;
const SEGMENT_GAP = 1.5;

export const DesignDonutChart: React.FC<DesignDonutChartProps> = ({
  segments,
  centerLabel,
  centerSub,
  sizeClass = 'w-32 h-32',
}) => {
  let offset = 0;
  const visible = segments.filter((s) => s.percentage > 0);

  return (
    <div className={`relative ${sizeClass} flex items-center justify-center flex-shrink-0`}>
      <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 36 36" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          className="stroke-slate-200 dark:stroke-cr-border-dark"
          strokeWidth={STROKE}
        />
        {visible.map((seg, i) => {
          const slice = Math.max(0, seg.percentage - SEGMENT_GAP);
          const dash = `${slice} ${100 - slice}`;
          const el = (
            <circle
              key={i}
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          );
          offset += seg.percentage;
          return el;
        })}
      </svg>
      <div className="absolute text-center px-2">
        <p className="text-lg font-extrabold text-slate-800 dark:text-white leading-none">
          {centerLabel}
        </p>
        {centerSub && (
          <p className="text-[10px] text-slate-400 dark:text-cr-muted font-medium mt-1 leading-tight">
            {centerSub}
          </p>
        )}
      </div>
    </div>
  );
};
