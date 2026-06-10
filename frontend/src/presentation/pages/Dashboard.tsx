import React, { useState } from 'react';
import { useAppStore, getActiveOwnChannel, getOwnChannels, getCompetitorChannels } from '../store/appStore';
import { ChannelGrowthChart } from '../components/ChannelGrowthChart';
import { ChannelDemographicsPanel } from '../components/ChannelDemographics';
import { AddChannelModal } from '../components/AddChannelModal';
import { ChannelAvatar } from '../components/ChannelAvatar';
import { ChannelManageList } from '../components/ChannelManageList';
import {
  Plus,
  Download,
  Calendar,
  HelpCircle,
  Bookmark,
  ChevronRight,
  Smile,
  Lightbulb,
  AlertTriangle,
  ArrowUpRight,
  Youtube,
  RefreshCw,
} from 'lucide-react';
import { Opportunity } from '../../domain/entities';

export const Dashboard: React.FC = () => {
  const {
    channels,
    channelSnapshots,
    selectedChannelId,
    setSelectedChannelId,
    opportunities,
    saveIdea,
    ideas,
    syncChannel,
    isSyncing,
    setTab,
    youtubeApiConfigured,
    addOwnChannel,
    addCompetitorChannel,
    removeChannel,
  } = useAppStore();

  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showAddCompetitorModal, setShowAddCompetitorModal] = useState(false);

  const ownChannels = getOwnChannels(channels);
  const linkedChannel = getActiveOwnChannel(channels, selectedChannelId);
  const competitors = getCompetitorChannels(channels);

  // Comprobar si una oportunidad ya está guardada como idea
  const isSaved = (topic: string) => {
    return ideas.some(i => i.topic === topic);
  };

  const handleSaveIdea = (opp: Opportunity) => {
    if (isSaved(opp.title)) return;
    saveIdea(opp.title, opp.opportunityScore, opp.format);
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Oportunidades de Contenido
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Descubre qué temas y formatos tienen más potencial en tu nicho
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <span>12 Mayo - 10 Junio 2024</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm">
            <Download size={14} />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setShowAddChannelModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-500/10"
          >
            <Plus size={14} />
            <span>Agregar mi canal</span>
          </button>
          <button
            onClick={() => setShowAddCompetitorModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Agregar competidor</span>
          </button>
        </div>
      </div>

      {/* Sin canales vinculados */}
      {ownChannels.length === 0 && (
        <div className="mb-6 p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
            <Youtube size={28} className="text-violet-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Agrega tu primer canal de YouTube
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            Vincula tu canal con tu handle (ej. <strong className="text-violet-500">@jhonatanm255</strong>).
            No necesitas ingresar contraseña ni conectar tu cuenta de Google.
          </p>
          <button
            onClick={() => setShowAddChannelModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-lg"
          >
            <Plus size={16} />
            Agregar canal de YouTube
          </button>
        </div>
      )}

      {/* Gestión de mis canales */}
      {ownChannels.length > 0 && (
        <div className="mb-6 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Mis canales de YouTube</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecciona, sincroniza o elimina tus canales vinculados
              </p>
            </div>
            <button
              onClick={() => setShowAddChannelModal(true)}
              className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Agregar canal
            </button>
          </div>
          <ChannelManageList
            channels={ownChannels}
            selectedChannelId={selectedChannelId}
            isSyncing={isSyncing}
            onSelect={setSelectedChannelId}
            onSync={youtubeApiConfigured ? syncChannel : undefined}
            onDelete={removeChannel}
            showSync={youtubeApiConfigured}
          />
        </div>
      )}

      <AddChannelModal
        open={showAddChannelModal}
        onClose={() => setShowAddChannelModal(false)}
        onSubmit={addOwnChannel}
        title="Agregar canal de YouTube"
        description="Ingresa el handle o URL de tu canal. Los datos son públicos, no necesitas iniciar sesión en Google."
        submitLabel="Vincular canal"
      />

      <AddChannelModal
        open={showAddCompetitorModal}
        onClose={() => setShowAddCompetitorModal(false)}
        onSubmit={addCompetitorChannel}
        title="Agregar competidor"
        description="Monitorea un canal de la competencia para comparar métricas y detectar oportunidades."
        submitLabel="Agregar competidor"
      />

      {/* Histórico del canal — Paso 0 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChannelGrowthChart snapshots={channelSnapshots} metric="subscribers" />
        <ChannelGrowthChart snapshots={channelSnapshots} metric="views" />
      </div>

      {/* Demografía de audiencia (YouTube Analytics OAuth) */}
      {linkedChannel && (
        <div className="mb-4">
          <ChannelDemographicsPanel />
        </div>
      )}

      {linkedChannel && (
        <div className="mb-4 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-800 dark:text-white">{linkedChannel.name}</span>
            {' · '}
            {linkedChannel.subscriberCount.toLocaleString('es-ES')} suscriptores
            {' · '}
            {(linkedChannel.totalViews ?? 0).toLocaleString('es-ES')} vistas totales
          </div>
          {youtubeApiConfigured && (
            <button
              onClick={() => syncChannel(linkedChannel.id)}
              disabled={isSyncing}
              className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              Actualizar métricas de hoy
            </button>
          )}
        </div>
      )}

      {/* Grid Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">

        {/* Card 1 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Temas Detectados</span>
            <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ↑ 18%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">248</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">vs 12 Abr - 11 May</span>
          </div>
          <div className="h-6 mt-3">
            {/* Sparkline SVG Violet */}
            <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0,15 Q20,10 40,12 T80,5 T100,2" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Oportunidades Activas</span>
            <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ↑ 23%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">32</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">vs 12 Abr - 11 May</span>
          </div>
          <div className="h-6 mt-3">
            {/* Sparkline SVG Green */}
            <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0,18 Q30,12 50,15 T80,8 T100,3" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Solicitudes de Contenido</span>
            <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ↑ 31%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">1,487</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">vs 12 Abr - 11 May</span>
          </div>
          <div className="h-6 mt-3">
            {/* Sparkline SVG Yellow */}
            <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0,16 Q20,18 45,10 T85,12 T100,4" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Comentarios Analizados</span>
            <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ↑ 27%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">24,532</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">vs 12 Abr - 11 May</span>
          </div>
          <div className="h-6 mt-3">
            {/* Sparkline SVG Blue */}
            <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0,17 Q30,10 60,15 T90,5 T100,2" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 5 */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Competidores Monitoreados</span>
            <button
              onClick={() => setTab('competitors')}
              className="text-violet-600 dark:text-violet-400 text-[10px] font-bold hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-800 dark:text-white">10</span>
          </div>
          {/* Avatar stack */}
          <div className="flex -space-x-2 mt-4 overflow-hidden">
            {competitors.slice(0, 5).map((c) => (
              <div key={c.id} className="ring-2 ring-white dark:ring-slate-950 rounded-full">
                <ChannelAvatar src={c.avatarUrl} name={c.name} size="sm" />
              </div>
            ))}
            {competitors.length > 5 && (
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-950 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                +{competitors.length - 5}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Main Grid: Left Opportunities, Right Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

        {/* Oportunidades Destacadas (Col 7) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Oportunidades Destacadas</h2>
              <button title="Explicación del Score" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <HelpCircle size={14} />
              </button>
            </div>
            <button
              onClick={() => setTab('opportunities')}
              className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline"
            >
              Ver todas las oportunidades →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="pb-3 font-semibold">Tema / Idea de Video</th>
                  <th className="pb-3 text-center font-semibold">Opportunity Score</th>
                  <th className="pb-3 font-semibold">Demanda</th>
                  <th className="pb-3 font-semibold">Competencia</th>
                  <th className="pb-3 text-center font-semibold">Tendencia</th>
                  <th className="pb-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {opportunities.slice(0, 5).map((opp, index) => {
                  const initialChar = opp.topicId.charAt(0);
                  const colors = ['bg-indigo-500/10 text-indigo-500', 'bg-violet-500/10 text-violet-500', 'bg-emerald-500/10 text-emerald-500', 'bg-amber-500/10 text-amber-500', 'bg-pink-500/10 text-pink-500'];
                  const avatarColor = colors[index % colors.length];

                  return (
                    <tr key={opp.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatarColor}`}>
                            {initialChar}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                              {opp.title}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {opp.format}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400">
                            {opp.opportunityScore}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none">
                            {opp.opportunityScore >= 85 ? 'Excelente' : opp.opportunityScore >= 70 ? 'Bueno' : 'Medio'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${opp.demand === 'Alta'
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}>
                          {opp.demand}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${opp.competition === 'Baja' || opp.competition === 'Muy Baja'
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}>
                          {opp.competition}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="w-12 h-6 mx-auto">
                          <svg className="w-full h-full" viewBox="0 0 50 20" preserveAspectRatio="none">
                            <path
                              d={opp.id.includes('tutorial')
                                ? "M0,18 L12,14 L24,10 L36,5 L50,2"
                                : "M0,17 L12,17 L24,12 L36,10 L50,6"}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSaveIdea(opp)}
                            className={`p-1.5 rounded-lg border transition-colors ${isSaved(opp.title)
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                            title={isSaved(opp.title) ? "Guardada en Ideas" : "Guardar en Ideas"}
                          >
                            <Bookmark size={12} fill={isSaved(opp.title) ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => setTab('opportunities')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análisis de Sentimiento (Col 5) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Análisis de Sentimiento
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <HelpCircle size={14} />
              </button>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400">Últimos 30 días</span>
          </div>

          {/* Ring Chart Container */}
          <div className="flex items-center gap-6 py-3 border-b border-slate-100 dark:border-slate-800/50">
            {/* SVG Ring Chart */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="3" />
                {/* Positive (61%) green */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                  strokeDasharray="61 39" strokeDashoffset="0" />
                {/* Neutral (25%) yellow */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray="25 75" strokeDashoffset="-61" />
                {/* Negative (14%) red */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3"
                  strokeDasharray="14 86" strokeDashoffset="-86" />
              </svg>
              <div className="absolute text-center">
                <p className="text-base font-extrabold text-slate-800 dark:text-white leading-none">24,532</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-1">comentarios</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Positivos</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">61% <span className="font-normal text-[10px] text-slate-400">(14,976)</span></span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Neutros</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">25% <span className="font-normal text-[10px] text-slate-400">(6,132)</span></span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Negativos</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">14% <span className="font-normal text-[10px] text-slate-400">(3,424)</span></span>
              </div>
            </div>
          </div>

          {/* Highlights Insights */}
          <div className="py-4 flex-1 flex flex-col gap-3 justify-center">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Principales Insights</h4>

            <div className="flex gap-2.5 text-xs">
              <div className="text-emerald-500 mt-0.5"><Smile size={15} /></div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                A la audiencia le encanta la claridad y los ejemplos prácticos.
              </p>
            </div>

            <div className="flex gap-2.5 text-xs">
              <div className="text-amber-500 mt-0.5"><Lightbulb size={15} /></div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Muchos piden más contenido sobre <strong className="text-slate-800 dark:text-white font-semibold">Coolify</strong> y su instalación en VPS.
              </p>
            </div>

            <div className="flex gap-2.5 text-xs">
              <div className="text-red-500 mt-0.5"><AlertTriangle size={15} /></div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                La frustración principal está relacionada con errores de puertos durante la instalación.
              </p>
            </div>
          </div>

          {/* Temas más mencionados tags */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">coolify <span className="font-normal text-slate-400 ml-0.5">1,243</span></span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">vps <span className="font-normal text-slate-400 ml-0.5">876</span></span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">docker <span className="font-normal text-slate-400 ml-0.5">754</span></span>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">instalación <span className="font-normal text-slate-400 ml-0.5">642</span></span>
            </div>
            <button
              onClick={() => setTab('comments')}
              className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex-shrink-0"
            >
              Ver todos
            </button>
          </div>

        </div>

      </div>

      {/* Grid: Trends Line Chart (Left), Content Requests (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

        {/* Tendencias de Temas (Col 8) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Tendencia de Temas
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <HelpCircle size={14} />
              </button>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400">Últimos 30 días</span>
          </div>

          {/* Chart Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-0.5 bg-violet-500 rounded" />
              <span>Coolify</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-0.5 bg-blue-500 rounded" />
              <span>Docker Compose</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span>Kubernetes</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-0.5 bg-amber-500 rounded" />
              <span>Next.js 15</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-0.5 bg-red-500 rounded" />
              <span>IA Local</span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="h-48 w-full mt-4 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(148,163,184,0.08)" />

              {/* Data Lines */}
              {/* Coolify (Violet) */}
              <path d="M0,105 L100,98 L200,85 L300,70 L400,45 L500,10" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />

              {/* Docker Compose (Blue) */}
              <path d="M0,90 L100,85 L200,82 L300,88 L400,75 L500,68" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

              {/* Kubernetes (Green) */}
              <path d="M0,110 L100,102 L200,95 L300,90 L400,82 L500,75" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

              {/* Next.js 15 (Amber) */}
              <path d="M0,100 L100,95 L200,88 L300,80 L400,72 L500,55" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

              {/* IA Local (Red) */}
              <path d="M0,115 L100,105 L200,90 L300,65 L400,35 L500,5" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            {/* X Axis Labels */}
            <div className="flex justify-between text-[9px] text-slate-400 font-semibold mt-2 px-1">
              <span>12 May</span>
              <span>17 May</span>
              <span>22 May</span>
              <span>27 May</span>
              <span>1 Jun</span>
              <span>6 Jun</span>
              <span>10 Jun</span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-center mt-2.5 italic">
              Índice de crecimiento de menciones y vistas relativas
            </p>
          </div>

        </div>

        {/* Solicitudes de Contenido (Col 4) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Solicitudes de Contenido (Comentarios)
            </h2>
            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
              Top Solicitudes
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-3">
            {[
              { text: 'Haz un tutorial de Coolify', count: 423, growth: 34, color: 'bg-violet-500' },
              { text: 'Explica cómo usar Kubernetes', count: 312, growth: 22, color: 'bg-blue-500' },
              { text: 'Parte 2 de este video', count: 268, growth: 18, color: 'bg-emerald-500' },
              { text: 'Cómo conseguir un VPS barato', count: 198, growth: 12, color: 'bg-amber-500' },
              { text: 'Errores comunes en la instalación', count: 154, growth: 8, color: 'bg-red-500' }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{idx + 1}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-850 dark:text-white">{item.count}</span>
                    <span className="text-[9px] text-emerald-500 font-bold">↑ {item.growth}%</span>
                  </div>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.count / 423) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setTab('comments')}
            className="w-full mt-4 text-center text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline"
          >
            Ver todas las solicitudes →
          </button>
        </div>

      </div>

      {/* Competidores Recientes Bottom */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Competidores Recientes
          </h2>
          <button
            onClick={() => setTab('competitors')}
            className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline"
          >
            Ver todos los competidores →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {competitors.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 border-dashed flex flex-col items-center text-center hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer"
              onClick={() => setTab('competitors')}
            >
              <ChannelAvatar src={c.avatarUrl} name={c.name} size="md" className="border border-violet-500/20 mb-2" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate w-full">
                {c.name}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {(c.subscriberCount / 1000000).toFixed(2)}M suscriptores
              </p>

              <div className="flex justify-between items-center w-full mt-3 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 text-[10px]">
                <div className="text-left">
                  <p className="text-slate-400">Vistas (30d)</p>
                  <p className="font-bold text-slate-700 dark:text-slate-350">
                    +{c.views30d >= 1000000 ? `${(c.views30d / 1000000).toFixed(1)}M` : `${Math.round(c.views30d / 1000)}K`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Engagement</p>
                  <p className="font-bold text-emerald-500">
                    +{c.engagementRate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
