import React from 'react';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  /** Valores 0–100 */
  values: number[];
}

interface SmoothLineChartProps {
  series: LineSeries[];
  labels: string[];
  heightClass?: string;
}

function smoothPath(values: number[], width = 500, height = 110, padding = 8): string {
  if (values.length < 2) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: padding + (height - padding * 2) * (1 - (v - min) / range),
  }));

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` Q${cpx},${prev.y} ${curr.x},${curr.y}`;
  }
  return d;
}

export const SmoothLineChart: React.FC<SmoothLineChartProps> = ({
  series,
  labels,
  heightClass = 'h-52',
}) => (
  <div className={heightClass}>
    <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5">
      {series.map((s) => (
        <div key={s.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-cr-muted">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
    <div className="relative w-full h-[calc(100%-2.75rem)]">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
        {[20, 50, 80, 110].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="500"
            y2={y}
            className="stroke-slate-200/80 dark:stroke-cr-border-dark"
            strokeWidth="1"
          />
        ))}
        {series.map((s) => (
          <path
            key={s.id}
            d={smoothPath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) => {
          const step = 500 / (s.values.length - 1);
          return s.values.map((v, i) => {
            const max = Math.max(...s.values, 1);
            const min = Math.min(...s.values, 0);
            const range = max - min || 1;
            const y = 8 + 104 * (1 - (v - min) / range);
            return (
              <circle
                key={`${s.id}-${i}`}
                cx={i * step}
                cy={y}
                r="3"
                fill={s.color}
                className="opacity-95"
              />
            );
          });
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-cr-muted font-medium mt-3 px-0.5">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  </div>
);
