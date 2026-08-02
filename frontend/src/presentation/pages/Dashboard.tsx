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
  Hash,
  MessageSquareText,
  MessagesSquare,
  Users,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { Opportunity } from '../../domain/entities';
import { MetricCard } from '../components/ui/MetricCard';
import { VideoEngagementBadge } from '../components/VideoEngagementBadge';
import { DesignDonutChart } from '../components/charts/DesignDonutChart';
import { SmoothLineChart } from '../components/charts/SmoothLineChart';
import { RankedProgressList } from '../components/charts/RankedProgressList';
import { MiniTrendSparkline } from '../components/charts/MiniTrendSparkline';
import { formatCompactNumber, formatEngagementCount } from '../utils/format';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { DEMO_MAX_ANALYZED_VIDEOS } from '../../domain/demoLimits';

const TREND_SERIES = [
  { id: 'coolify', label: 'Coolify', color: '#6366f1', values: [12, 18, 29, 42, 62, 92] },
  { id: 'docker', label: 'Docker Compose', color: '#3B82F6', values: [25, 29, 32, 27, 38, 43] },
  { id: 'k8s', label: 'Kubernetes', color: '#22C55E', values: [8, 15, 21, 25, 32, 38] },
  { id: 'next', label: 'Next.js 15', color: '#F59E0B', values: [17, 21, 27, 33, 40, 54] },
  { id: 'ia', label: 'IA Local', color: '#EF4444', values: [4, 12, 25, 46, 71, 96] },
];

const CONTENT_REQUESTS = [
  { text: 'Haz un tutorial de Coolify', count: 423, growth: 34, color: '#6366f1' },
  { text: 'Explica cómo usar Kubernetes', count: 312, growth: 22, color: '#3B82F6' },
  { text: 'Parte 2 de este video', count: 268, growth: 18, color: '#22C55E' },
  { text: 'Cómo conseguir un VPS barato', count: 198, growth: 12, color: '#F59E0B' },
  { text: 'Errores comunes en la instalación', count: 154, growth: 8, color: '#EF4444' },
];

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
    commentAnalysis,
    channelVideos,
    channelEngagement,
    loadChannelVideos,
    loadCommentAnalysis,
    demoAnalyzedCount,
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

  const commentStats = commentAnalysis?.stats;
  const contentSentiment = commentAnalysis?.contentSentiment ?? commentAnalysis?.sentiment;

  React.useEffect(() => {
    if (linkedChannel) {
      loadChannelVideos();
      loadCommentAnalysis();
    }
  }, [linkedChannel?.id, loadChannelVideos, loadCommentAnalysis]);

  return (
    <div className="cr-page">

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Oportunidades de Contenido
          </h1>
          <p className="text-slate-500 dark:text-cr-muted text-sm mt-1">
            Descubre qué temas y formatos tienen más potencial en tu nicho
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="cr-btn-secondary cursor-pointer">
            <Calendar size={14} className="text-slate-400 dark:text-cr-muted" />
            <span>12 Mayo - 10 Junio 2024</span>
          </div>
          <button className="cr-btn-secondary">
            <Download size={14} />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => setShowAddChannelModal(true)}
            className="cr-btn-secondary"
          >
            <Plus size={14} />
            <span>Agregar mi canal</span>
          </button>
          <button
            onClick={() => setShowAddCompetitorModal(true)}
            className="cr-btn-primary"
          >
            <Plus size={14} />
            <span>Agregar Competidor</span>
          </button>
        </div>
      </div>

      {/* Banner Demo */}
      {ownChannels.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-fuchsia-500/10 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-fuchsia-950/30 p-5 flex-shrink-0">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-violet-400/10 dark:bg-violet-400/5 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/25">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Versión Demo</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-cr-muted mt-1 leading-relaxed break-words whitespace-normal">
                  Estás usando Content Radar en modo demo. Puedes analizar hasta {DEMO_MAX_ANALYZED_VIDEOS} videos para explorar las funcionalidades.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {demoAnalyzedCount}
                  <span className="text-sm font-bold text-slate-400 dark:text-cr-muted">/{DEMO_MAX_ANALYZED_VIDEOS}</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-cr-muted font-semibold uppercase tracking-wide">Videos analizados</p>
              </div>
              <div className="w-14 h-14 relative">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-cr-border-dark" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    strokeWidth="3" strokeLinecap="round"
                    className="text-violet-500 dark:text-violet-400"
                    strokeDasharray={`${(demoAnalyzedCount / DEMO_MAX_ANALYZED_VIDEOS) * 94.2} 94.2`}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sin canales vinculados */}
      {ownChannels.length === 0 && (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-cr-accent/20 flex items-center justify-center mx-auto mb-4">
            <Youtube size={28} className="text-violet-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Agrega tu primer canal de YouTube
          </h2>
          <p className="text-sm text-slate-500 dark:text-cr-muted max-w-md mx-auto mb-5">
            Vincula tu canal con tu handle (ej. <strong className="text-violet-500">@jhonatanm255</strong>).
            No necesitas ingresar contraseña ni conectar tu cuenta de Google.
          </p>
          <button
            onClick={() => setShowAddChannelModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cr-accent hover:bg-cr-accent-hover text-white text-sm font-bold transition-colors shadow-lg"
          >
            <Plus size={16} />
            Agregar canal de YouTube
          </button>
        </div>
      )}

      {/* Gestión de mis canales */}
      {ownChannels.length > 0 && (
        <div className="cr-card cr-card-pad">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Mis canales de YouTube</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecciona, sincroniza o elimina tus canales vinculados
              </p>
            </div>
            <button
              onClick={() => setShowAddChannelModal(true)}
              className="text-xs font-bold text-cr-accent dark:text-indigo-400 hover:underline flex items-center gap-1"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChannelGrowthChart snapshots={channelSnapshots} metric="subscribers" />
        <ChannelGrowthChart snapshots={channelSnapshots} metric="views" />
      </div>

      {/* Demografía de audiencia (YouTube Analytics OAuth) */}
      {linkedChannel && (
        <div>
          <ChannelDemographicsPanel />
        </div>
      )}

      {linkedChannel && (
        <div className="cr-card cr-card-pad flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-cr-muted space-y-2">
            <p>
              <span className="font-bold text-slate-800 dark:text-white">{linkedChannel.name}</span>
              {' · '}
              {linkedChannel.subscriberCount.toLocaleString('es-ES')} suscriptores
              {' · '}
              {(linkedChannel.totalViews ?? 0).toLocaleString('es-ES')} vistas totales
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <ThumbsUp size={14} />
                {formatCompactNumber(channelEngagement.totalLikes)} likes
                <span className="font-normal text-slate-400">(catálogo {channelVideos.length} videos)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-cr-muted">
                <ThumbsDown size={14} />
                {formatEngagementCount(channelEngagement.totalDislikes)} dislikes
                {!channelEngagement.analyticsConnected && (
                  <span className="font-normal text-slate-400">· conecta YouTube Analytics</span>
                )}
              </span>
            </div>
          </div>
          {youtubeApiConfigured && (
            <button
              onClick={() => syncChannel(linkedChannel.id)}
              disabled={isSyncing}
              className="text-xs font-bold text-cr-accent dark:text-indigo-400 hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              Actualizar métricas de hoy
            </button>
          )}
        </div>
      )}

      {/* Grid Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Temas Detectados"
          value={commentAnalysis?.topics.length ?? 0}
          delta="↑ 18%"
          sparklineColor="#6366f1"
          icon={Hash}
          iconColor="#6366f1"
          iconBg="bg-indigo-500/10"
        />
        <MetricCard
          label="Oportunidades Activas"
          value={opportunities.length}
          delta="↑ 23%"
          sparklineColor="#22C55E"
          icon={TrendingUp}
          iconColor="#22C55E"
          iconBg="bg-emerald-500/10"
        />
        <MetricCard
          label="Solicitudes de Contenido"
          value={commentAnalysis?.commentsByCategory.sugerencia.length ?? 0}
          delta="↑ 31%"
          sparklineColor="#F59E0B"
          icon={MessageSquareText}
          iconColor="#F59E0B"
          iconBg="bg-amber-500/10"
        />
        <MetricCard
          label="Comentarios Analizados"
          value={formatCompactNumber(commentStats?.totalComments ?? 0)}
          sublabel={
            commentStats?.totalAvailable
              ? `de ${formatCompactNumber(commentStats.totalAvailable)}`
              : undefined
          }
          delta={commentStats?.coveragePercent === 100 ? '100%' : '↑ 18%'}
          sparklineColor="#3B82F6"
          icon={MessagesSquare}
          iconColor="#3B82F6"
          iconBg="bg-blue-500/10"
        />
        <MetricCard
          label="Likes del canal"
          value={formatCompactNumber(channelEngagement.totalLikes)}
          footer={
            <VideoEngagementBadge
              likes={channelEngagement.totalLikes}
              dislikes={channelEngagement.totalDislikes}
              compact
            />
          }
          icon={ThumbsUp}
          iconColor="#22C55E"
          iconBg="bg-emerald-500/10"
        />
        <MetricCard
          label="Competidores"
          value={competitors.length}
          footer={
            <div className="flex -space-x-2 overflow-hidden">
              {competitors.slice(0, 5).map((c) => (
                <div key={c.id} className="ring-2 ring-white dark:ring-cr-bg-dark rounded-full">
                  <ChannelAvatar src={c.avatarUrl} name={c.name} size="sm" />
                </div>
              ))}
            </div>
          }
          icon={Users}
          iconColor="#6366f1"
          iconBg="bg-indigo-500/10"
        />
      </div>

      {/* Main Grid: Left Opportunities, Right Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Oportunidades Destacadas (Col 7) */}
        <div className="lg:col-span-7 cr-card cr-card-pad flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Oportunidades Destacadas</h2>
              <button title="Explicación del Score" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <HelpCircle size={14} />
              </button>
            </div>
            <button
              onClick={() => setTab('opportunities')}
              className="text-xs text-cr-accent dark:text-indigo-400 font-bold hover:underline"
            >
              Ver todas las oportunidades →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-cr-border-dark text-[10px] uppercase font-bold text-slate-400 dark:text-cr-muted tracking-wider">
                  <th className="pb-3 font-semibold whitespace-normal">Tema / Idea de Video</th>
                  <th className="pb-3 text-center font-semibold whitespace-normal">Score</th>
                  <th className="pb-3 font-semibold whitespace-normal">Demanda</th>
                  <th className="pb-3 font-semibold whitespace-normal">Competencia</th>
                  <th className="pb-3 text-center font-semibold whitespace-normal">Tendencia</th>
                  <th className="pb-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-cr-border-dark/60">
                {opportunities.slice(0, 5).map((opp, index) => {
                  const initialChar = opp.topicId.charAt(0);
                  const colors = ['bg-indigo-500/10 text-indigo-500', 'bg-violet-500/10 text-violet-500', 'bg-emerald-500/10 text-emerald-500', 'bg-amber-500/10 text-amber-500', 'bg-pink-500/10 text-pink-500'];
                  const avatarColor = colors[index % colors.length];

                  return (
                    <tr key={opp.id} className="group cr-row-hover">
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${avatarColor}`}>
                            {initialChar}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-cr-accent dark:group-hover:text-indigo-400 transition-colors">
                              {opp.title}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-cr-muted-fg">
                              {opp.format}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-bold text-cr-success">
                            {opp.opportunityScore}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-cr-muted-fg font-medium leading-none">
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
                        <MiniTrendSparkline
                          variant={opp.id.includes('tutorial') ? 'up' : 'flat'}
                        />
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex flex-col items-end justify-end gap-2">
                          <button
                            onClick={() => handleSaveIdea(opp)}
                            className={`p-1.5 rounded-lg border transition-colors ${isSaved(opp.title)
                                ? 'bg-cr-accent border-cr-accent text-white'
                                : 'bg-white dark:bg-cr-card-dark border-slate-200 dark:border-cr-border-dark text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                            title={isSaved(opp.title) ? "Guardada en Ideas" : "Guardar en Ideas"}
                          >
                            <Bookmark size={12} fill={isSaved(opp.title) ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => setTab('opportunities')}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-cr-border-dark bg-white dark:bg-cr-card-dark text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
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
        <div className="lg:col-span-5 cr-card cr-card-pad flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Análisis de Sentimiento
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <HelpCircle size={14} />
              </button>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400">Últimos 30 días</span>
          </div>

          {/* Ring Chart Container */}
          <div className="flex items-center gap-6 py-4 border-b border-slate-100 dark:border-cr-border-dark">
            <DesignDonutChart
              sizeClass="w-32 h-32"
              centerLabel={formatCompactNumber(commentStats?.totalComments ?? 0)}
              centerSub="comentarios"
              segments={[
                { percentage: contentSentiment?.positive ?? 0, color: '#22C55E' },
                { percentage: contentSentiment?.neutral ?? 0, color: '#F59E0B' },
                { percentage: contentSentiment?.negative ?? 0, color: '#EF4444' },
              ]}
            />

            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-cr-muted font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Positivos</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100">{contentSentiment?.positive ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-cr-muted font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Neutros</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100">{contentSentiment?.neutral ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-cr-muted font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Negativos</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100">{contentSentiment?.negative ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Highlights Insights */}
          <div className="py-4 flex-1 flex flex-col gap-3 justify-center">
            <h4 className="text-xs font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider">Principales Insights</h4>

            <div className="flex gap-2.5 text-xs">
              <div className="text-emerald-500 mt-0.5"><Smile size={15} /></div>
              <p className="text-slate-600 dark:text-cr-muted leading-relaxed">
                A la audiencia le encanta la claridad y los ejemplos prácticos.
              </p>
            </div>

            <div className="flex gap-2.5 text-xs">
              <div className="text-amber-500 mt-0.5"><Lightbulb size={15} /></div>
              <p className="text-slate-600 dark:text-cr-muted leading-relaxed">
                Muchos piden más contenido sobre <strong className="text-slate-800 dark:text-white font-semibold">Coolify</strong> y su instalación en VPS.
              </p>
            </div>

            <div className="flex gap-2.5 text-xs">
              <div className="text-red-500 mt-0.5"><AlertTriangle size={15} /></div>
              <p className="text-slate-600 dark:text-cr-muted leading-relaxed">
                La frustración principal está relacionada con errores de puertos durante la instalación.
              </p>
            </div>
          </div>

          {/* Temas más mencionados tags */}
          <div className="pt-3 border-t border-slate-100 dark:border-cr-border-dark/50 flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(commentAnalysis?.topics ?? []).slice(0, 4).map((topic) => (
                <span
                  key={topic.name}
                  className="text-[10px] font-bold cr-tag"
                >
                  {topic.name}{' '}
                  <span className="font-normal text-slate-400 ml-0.5">{topic.count}</span>
                </span>
              ))}
            </div>
            <button
              onClick={() => setTab('comments')}
              className="text-[10px] font-bold text-cr-accent dark:text-indigo-400 hover:underline flex-shrink-0"
            >
              Ver todos
            </button>
          </div>

        </div>

      </div>

      {/* Grid: Trends Line Chart (Left), Content Requests (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Tendencias de Temas (Col 8) */}
        <div className="lg:col-span-8 cr-card cr-card-pad">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Tendencia de Temas
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <HelpCircle size={14} />
              </button>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400">Últimos 30 días</span>
          </div>

          <SmoothLineChart
            series={TREND_SERIES}
            labels={['12 May', '17 May', '22 May', '27 May', '1 Jun', '6 Jun', '10 Jun']}
          />
          <p className="text-[10px] text-slate-400 dark:text-cr-muted-fg font-medium text-center mt-3 italic">
            Índice de crecimiento de menciones y vistas relativas
          </p>
        </div>

        {/* Solicitudes de Contenido (Col 4) */}
        <div className="lg:col-span-4 cr-card cr-card-pad flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              Solicitudes de Contenido (Comentarios)
            </h2>
            <span className="text-[9px] font-bold bg-slate-100 dark:bg-cr-elevated-dark text-slate-500 dark:text-cr-muted px-2 py-0.5 rounded-full">
              Top Solicitudes
            </span>
          </div>

          <RankedProgressList items={CONTENT_REQUESTS} />

          <button
            onClick={() => setTab('comments')}
            className="w-full mt-5 text-center text-xs text-cr-accent dark:text-indigo-400 font-bold hover:underline"
          >
            Ver todas las solicitudes →
          </button>
        </div>

      </div>

      {/* Competidores Recientes Bottom */}
      <div className="cr-card cr-card-pad">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Competidores Recientes
          </h2>
          <button
            onClick={() => setTab('competitors')}
            className="text-xs text-cr-accent dark:text-indigo-400 font-bold hover:underline"
          >
            Ver todos los competidores →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {competitors.slice(0, 6).map((c) => (
            <div
              key={c.id}
              className="cr-card-elevated p-4 flex flex-col items-center text-center hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all cursor-pointer"
              onClick={() => setTab('competitors')}
            >
              <ChannelAvatar src={c.avatarUrl} name={c.name} size="md" className="border border-violet-500/20 mb-2" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate w-full">
                {c.name}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-cr-muted-fg">
                {(c.subscriberCount / 1000000).toFixed(2)}M suscriptores
              </p>

              <div className="flex justify-between items-center w-full mt-3 border-t border-slate-200/50 dark:border-cr-border-dark/50 pt-2 text-[10px]">
                <div className="text-left">
                  <p className="text-slate-400">Vistas (30d)</p>
                  <p className="font-bold text-slate-700 dark:text-cr-muted">
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
