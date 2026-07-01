import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: string;
  deltaPositive?: boolean;
  sparklineColor?: string;
  sparklinePoints?: number[];
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  delta,
  deltaPositive = true,
  sparklineColor = '#6366f1',
  sparklinePoints,
  icon: Icon,
  iconColor = '#6366f1',
  iconBg = 'bg-indigo-500/10',
  footer,
  className = '',
}) => (
  <div className={`cr-card p-4 sm:p-5 flex flex-col justify-between min-h-[140px] transition-all hover:shadow-md ${className}`}>
    {/* Top Row: Icon, Label (Name), and Delta */}
    <div className="flex items-center justify-between w-full mb-3 gap-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {Icon && (
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${iconBg}`}
            style={{ color: iconColor }}
          >
            <Icon size={16} strokeWidth={2.25} />
          </div>
        )}
        <span className="cr-label leading-tight truncate text-[10px] sm:text-[11px] min-w-0 flex-1">{label}</span>
      </div>
      {delta && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            deltaPositive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}
        >
          {delta}
        </span>
      )}
    </div>

    {/* Value Section */}
    <div className="flex-1 flex flex-col justify-end">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight tabular-nums leading-none">
          {value}
        </span>
        {sublabel && (
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-cr-muted leading-none">{sublabel}</span>
        )}
      </div>
    </div>

    {/* Footer / Sparkline */}
    {footer ? (
      <div className="mt-3.5 w-full">{footer}</div>
    ) : (
      <div className="mt-3.5 -mx-1 w-full">
        <Sparkline color={sparklineColor} points={sparklinePoints} />
      </div>
    )}
  </div>
);
