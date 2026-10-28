import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trendText?: string;
  trendSubtext?: string;
  trendPositive?: boolean;
  sparklineColor?: string;
  sparklinePoints?: number[];
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  miniGaugePercent?: number;
  miniGaugeColor?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  trendText,
  trendSubtext,
  trendPositive = true,
  sparklineColor = '#3B82F6',
  sparklinePoints,
  icon: Icon,
  iconColor = '#3B82F6',
  iconBg = 'bg-blue-50 dark:bg-blue-950/40',
  miniGaugePercent,
  miniGaugeColor = '#10B981',
  footer,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all ${className}`}
    >
      {/* Top Row: Icon + Label */}
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
            style={{ color: iconColor }}
          >
            <Icon size={15} strokeWidth={2.2} />
          </div>
        )}
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
      </div>

      {/* Value & Mini Gauge */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
              {value}
            </span>
            {sublabel && (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {sublabel}
              </span>
            )}
          </div>
        </div>

        {/* Optional Mini circular donut arc ring */}
        {miniGaugePercent !== undefined && (
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={miniGaugeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${(miniGaugePercent / 100) * 88} 88`}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Trend Info */}
      {(trendText || trendSubtext) && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap mb-3">
          {trendText && (
            <span
              className={`font-bold flex items-center ${
                trendPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trendText}
            </span>
          )}
          {trendSubtext && (
            <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
              {trendSubtext}
            </span>
          )}
        </div>
      )}

      {/* Footer / Smooth Wavy Sparkline */}
      {footer ? (
        <div className="mt-1 w-full">{footer}</div>
      ) : (
        <div className="w-full h-8 -mb-1 mt-auto">
          <Sparkline
            color={sparklineColor}
            points={sparklinePoints}
            className="w-full h-8"
            showFill={true}
          />
        </div>
      )}
    </div>
  );
};
