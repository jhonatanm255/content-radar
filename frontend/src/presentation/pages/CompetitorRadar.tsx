import React, { useState } from 'react';
import { useAppStore, getCompetitorChannels } from '../store/appStore';
import { AddChannelModal } from '../components/AddChannelModal';
import { ChannelAvatar } from '../components/ChannelAvatar';
import { ChannelManageList } from '../components/ChannelManageList';
import { Users, Plus, Radio, ArrowUpRight, TrendingUp, Eye, Sparkles } from 'lucide-react';
import { formatCompactNumber } from '../utils/format';

export const CompetitorRadar: React.FC = () => {
  const {
    channels,
    addCompetitorChannel,
    removeChannel,
    syncChannel,
    isSyncing,
    youtubeApiConfigured,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<'resumen' | 'crecimiento' | 'videos' | 'topics' | 'engagement'>('resumen');
  const [showModal, setShowModal] = useState(false);

  const competitors = getCompetitorChannels(channels);

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Benchmark de Nicho
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Radar de Competidores
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Monitorea el crecimiento, métricas y estrategias de los canales de tu competencia.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Agregar competidor</span>
        </button>
      </div>

      {/* Empty State */}
      {competitors.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#121624] border border-dashed border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <Radio size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Aún no tienes competidores vinculados
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Agrega canales con su handle de YouTube (ej. <strong className="text-blue-600 dark:text-blue-400">@fireship</strong>) para comparar crecimiento y detectar oportunidades.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus size={14} /> Agregar primer competidor
          </button>
        </div>
      )}

      {/* Competitors Quick Grid */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {competitors.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none hover:border-blue-500/30 transition-all flex flex-col items-center text-center group"
            >
              <div className="relative mb-2">
                <ChannelAvatar src={c.avatarUrl} name={c.name} size="md" className="border border-blue-500/20" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121624]" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate w-full group-hover:text-blue-600 transition-colors">
                {c.name}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatCompactNumber(c.subscriberCount)} subs
              </p>
              <div className="w-16 h-5 mt-2">
                <svg className="w-full h-full" viewBox="0 0 50 15" preserveAspectRatio="none">
                  <path d="M0,12 L12,11 L24,7 L36,8 L50,2" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 pb-2 gap-1.5 overflow-x-auto">
        {(['resumen', 'crecimiento', 'videos', 'topics', 'engagement'] as const).map((tab) => {
          const labels = {
            resumen: 'Resumen General',
            crecimiento: 'Crecimiento',
            videos: 'Videos Recientes',
            topics: 'Temas Clave',
            engagement: 'Engagement',
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Management Card */}
      {competitors.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Canales en monitoreo ({competitors.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sincroniza métricas periódicamente para registrar la evolución de cada canal.
              </p>
            </div>
          </div>
          <ChannelManageList
            channels={competitors}
            isSyncing={isSyncing}
            onSync={youtubeApiConfigured ? syncChannel : undefined}
            onDelete={removeChannel}
            showSync={youtubeApiConfigured}
          />
        </div>
      )}

      {/* Add Competitor Modal */}
      <AddChannelModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={addCompetitorChannel}
        title="Agregar competidor"
        description="Ingresa el handle (ej. @veritasium) o URL del canal que quieres monitorear."
        submitLabel="Agregar competidor"
      />
    </div>
  );
};
