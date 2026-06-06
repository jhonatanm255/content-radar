import React, { useState } from 'react';
import { useAppStore, getCompetitorChannels } from '../store/appStore';
import { AddChannelModal } from '../components/AddChannelModal';
import { ChannelAvatar } from '../components/ChannelAvatar';
import { ChannelManageList } from '../components/ChannelManageList';
import { Radio, Plus } from 'lucide-react';

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
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Radar de Competidores
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Monitorea y compara canales de tu nicho
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md"
        >
          <Plus size={14} />
          <span>Agregar competidor</span>
        </button>
      </div>

      {competitors.length === 0 && (
        <div className="mb-6 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Aún no tienes competidores. Agrega canales con su handle de YouTube (ej. <strong>@fireship</strong>).
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
          >
            + Agregar primer competidor
          </button>
        </div>
      )}

      <AddChannelModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={addCompetitorChannel}
        title="Agregar competidor"
        description="Ingresa el handle o URL del canal que quieres monitorear."
        submitLabel="Agregar competidor"
      />

      {/* Gestión de competidores */}
      {competitors.length > 0 && (
        <div className="mb-6 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Competidores monitoreados</h2>
          <p className="text-[11px] text-slate-500 mb-4">Sincroniza métricas o elimina canales que ya no quieras seguir</p>
          <ChannelManageList
            channels={competitors}
            isSyncing={isSyncing}
            onSync={youtubeApiConfigured ? syncChannel : undefined}
            onDelete={removeChannel}
            showSync={youtubeApiConfigured}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {competitors.slice(0, 6).map((c) => (
          <div key={c.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
            <ChannelAvatar src={c.avatarUrl} name={c.name} size="md" className="border border-violet-500/20" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate w-full text-center mt-2">{c.name}</h4>
            <p className="text-[10px] text-slate-405 mt-0.5">
              {c.subscriberCount >= 1_000_000
                ? `${(c.subscriberCount / 1_000_000).toFixed(2)}M subs`
                : `${(c.subscriberCount / 1_000).toFixed(1)}K subs`}
            </p>
            <div className="w-14 h-5 mt-2.5">
              <svg className="w-full h-full" viewBox="0 0 50 15" preserveAspectRatio="none">
                <path d="M0,12 L10,12 L20,8 L30,9 L40,4 L50,1" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 gap-1 overflow-x-auto">
        {(['resumen', 'crecimiento', 'videos', 'topics', 'engagement'] as const).map((tab) => {
          const labels = {
            resumen: 'Resumen',
            crecimiento: 'Crecimiento',
            videos: 'Videos',
            topics: 'Temas',
            engagement: 'Engagement'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                isActive 
                  ? 'bg-violet-600 text-white' 
                  : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="p-8 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-center">
        <Radio size={32} className="mx-auto text-violet-500 mb-3 opacity-50" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {competitors.length > 0
            ? 'Comparativas detalladas disponibles próximamente. Sincroniza competidores para acumular histórico.'
            : 'Agrega competidores para ver comparativas de crecimiento y engagement.'}
        </p>
      </div>

    </div>
  );
};
