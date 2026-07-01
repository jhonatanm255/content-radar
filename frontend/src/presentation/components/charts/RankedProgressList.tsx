import React from 'react';

export interface RankedItem {
  text: string;
  count: number;
  growth?: number;
  color: string;
}

interface RankedProgressListProps {
  items: RankedItem[];
  maxCount?: number;
}

export const RankedProgressList: React.FC<RankedProgressListProps> = ({ items, maxCount }) => {
  const max = maxCount ?? Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="flex flex-col gap-5">
      {items.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-slate-400 dark:text-cr-muted font-bold w-4 text-center">{idx + 1}</span>
              <span className="text-slate-700 dark:text-slate-100 font-semibold truncate">
                {item.text}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-extrabold text-slate-800 dark:text-white tabular-nums">{item.count}</span>
              {item.growth != null && (
                <span className="text-[10px] text-cr-success font-bold">↑ {item.growth}%</span>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-cr-elevated-dark overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
