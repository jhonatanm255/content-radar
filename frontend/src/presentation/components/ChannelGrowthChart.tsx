import React from 'react';
import { ChannelSnapshot } from '../../domain/entities';
import { TrendingUp, Users, Eye } from 'lucide-react';

interface ChannelGrowthChartProps {
  snapshots: ChannelSnapshot[];
  metric?: 'subscribers' | 'views';
}

export const ChannelGrowthChart: React.FC<ChannelGrowthChartProps> = ({
  snapshots,
  metric = 'subscribers',
}) => {
  if (snapshots.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
          <TrendingUp size={16} className="text-violet-500" />
          Histórico del canal
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aún no hay datos históricos. Sincroniza tu canal en Ajustes para comenzar a registrar métricas día a día.
        </p>
      </div>
    );
  }

  const values = snapshots.map((s) =>
    metric === 'subscribers' ? s.subscriberCount : s.totalViews
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 100;
  const height = 50;
  const points = values
    .map((v, i) => {
      const x = snapshots.length === 1 ? width / 2 : (i / (snapshots.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  const latestValue = metric === 'subscribers' ? latest.subscriberCount : latest.totalViews;
  const firstValue = metric === 'subscribers' ? first.subscriberCount : first.totalViews;
  const growth = firstValue > 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;
  const isPositive = growth >= 0;

  const formatNumber = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString();

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          {metric === 'subscribers' ? (
            <Users size={16} className="text-violet-500" />
          ) : (
            <Eye size={16} className="text-violet-500" />
          )}
          {metric === 'subscribers' ? 'Crecimiento de suscriptores' : 'Vistas totales del canal'}
        </h2>
        {snapshots.length > 1 && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <p className="text-2xl font-extrabold text-slate-800 dark:text-white">
            {formatNumber(latestValue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {snapshots.length} registro{snapshots.length !== 1 ? 's' : ''} · último: {latest.snapshotDate}
          </p>
          <svg
            className="w-full h-16 mt-3 overflow-visible"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <polyline
              points={points}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>{first.snapshotDate}</span>
            <span>{latest.snapshotDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
