import React, { useState } from 'react';
import { useAppStore, getActiveOwnChannel, getOwnChannels } from '../store/appStore';
import { MetricCard } from '../components/ui/MetricCard';
import { DesignDonutChart } from '../components/charts/DesignDonutChart';
import { VideoThumbnail } from '../components/VideoThumbnail';
import { AddChannelModal } from '../components/AddChannelModal';
import {
  Calendar,
  ChevronDown,
  Sparkles,
  Flame,
  Meh,
  Lightbulb,
  ChevronRight,
  Clock,
  MessageSquare,
  Bookmark,
  BarChart2,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  AlertCircle,
  Layers,
  Heart,
  Zap,
  Check,
  X,
  Target,
} from 'lucide-react';
import { formatCompactNumber } from '../utils/format';

interface OpportunityModalData {
  title: string;
  tag: string;
  subtitle: string;
  description: string;
  hook: string;
}

export const Dashboard: React.FC = () => {
  const {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    addOwnChannel,
    setTab,
    saveIdea,
    ideas,
    commentAnalysis,
    channelVideos,
    channelEngagement,
  } = useAppStore();

  const [dateRange, setDateRange] = useState('Últimos 28 días');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [demographicsTab, setDemographicsTab] = useState<'edad' | 'genero' | 'ubicacion'>('edad');
  const [selectedIdeaModal, setSelectedIdeaModal] = useState<OpportunityModalData | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const ownChannels = getOwnChannels(channels);
  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  // Dynamic values or realistic defaults matching inspiration mockup
  const totalComments = commentAnalysis?.stats?.totalComments || 8492;
  const positiveSentiment = commentAnalysis?.contentSentiment?.positive || 78;
  const neutralSentiment = commentAnalysis?.contentSentiment?.neutral || 15;
  const negativeSentiment = commentAnalysis?.contentSentiment?.negative || 7;
  const engagementRate = activeChannel?.engagementRate
    ? `${activeChannel.engagementRate}%`
    : '4.8%';
  const detectedOpportunitiesCount = 24;

  const topVideo = channelVideos[0] || {
    id: 'demo-top',
    title: 'Cómo usar IA para ser más productivo',
    viewCount: 128000,
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=320&h=180&q=80',
  };

  const handleSaveIdea = (title: string) => {
    saveIdea(title, 88, 'Tutorial paso a paso');
    setSavedSuccess(title);
    setTimeout(() => setSavedSuccess(null), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard de audiencia
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Convierte los comentarios de tus videos en insights accionables con el poder de la IA.
          </p>

          {/* Filters Bar: Date & Channel */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {/* Date Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDateDropdown(!showDateDropdown);
                  setShowChannelDropdown(false);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all"
              >
                <Calendar size={13} className="text-slate-400" />
                <span>{dateRange}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {showDateDropdown && (
                <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-[#172036] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs">
                  {['Últimos 7 días', 'Últimos 28 días', 'Últimos 90 días', 'Este año'].map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setShowDateDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 font-medium hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors ${
                        dateRange === range
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Channel Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowChannelDropdown(!showChannelDropdown);
                  setShowDateDropdown(false);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span className="truncate max-w-[150px]">
                  {activeChannel ? activeChannel.name : 'Tu canal principal'}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {showChannelDropdown && (
                <div className="absolute left-0 mt-1.5 w-56 bg-white dark:bg-[#172036] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                    Mis canales
                  </div>
                  {ownChannels.length > 0 ? (
                    ownChannels.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedChannelId(c.id);
                          setShowChannelDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors ${
                          selectedChannelId === c.id
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {selectedChannelId === c.id && <Check size={14} />}
                      </button>
                    ))
                  ) : (
                    <div className="px-3.5 py-2 text-slate-400 italic">No hay canales vinculados</div>
                  )}
                  <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1">
                    <button
                      onClick={() => {
                        setShowChannelDropdown(false);
                        setShowAddChannelModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-blue-600 dark:text-blue-400 font-bold hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      + Vincular nuevo canal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Highlight Cards */}
        <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
          {/* Card 1: Currently Analyzed Video */}
          <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none min-w-[260px] max-w-xs flex-1">
            <VideoThumbnail
              src={topVideo.thumbnailUrl}
              title={topVideo.title}
              className="w-16 h-12 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {topVideo.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatCompactNumber(topVideo.viewCount)} vistas • hace 5 días
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Analizado
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: AI Analyzing Banner */}
          <div className="bg-gradient-to-br from-[#4F46E5] via-[#4338CA] to-[#3B82F6] text-white rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-md shadow-indigo-500/15 min-w-[260px] max-w-xs flex-1 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <h4 className="text-xs font-bold tracking-tight">IA Analizando comentarios...</h4>
            </div>
            <p className="text-[11px] text-indigo-100 leading-tight mb-2.5">
              Encontrando oportunidades y patrones de interés
            </p>
            {/* Glowing animated progress bar */}
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-3/4 animate-pulse shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total comentarios */}
        <MetricCard
          label="Total de comentarios"
          value={formatCompactNumber(totalComments)}
          trendText="↑ 24%"
          trendSubtext="vs. 28 días anteriores"
          trendPositive={true}
          sparklineColor="#38BDF8"
          sparklinePoints={[15, 12, 14, 10, 13, 8, 5]}
          icon={MessageSquare}
          iconColor="#3B82F6"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
        />

        {/* Card 2: Sentimiento general */}
        <MetricCard
          label="Sentimiento general"
          value={`${positiveSentiment}%`}
          sublabel="Positivo"
          miniGaugePercent={positiveSentiment}
          miniGaugeColor="#10B981"
          trendText="↑ 12%"
          trendPositive={true}
          sparklineColor="#10B981"
          sparklinePoints={[16, 15, 13, 14, 10, 8, 4]}
          icon={Meh}
          iconColor="#10B981"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />

        {/* Card 3: Engagement promedio */}
        <MetricCard
          label="Engagement promedio"
          value={engagementRate}
          trendText="↑ 18%"
          trendSubtext="vs. 28 días anteriores"
          trendPositive={true}
          sparklineColor="#3B82F6"
          sparklinePoints={[14, 13, 15, 11, 13, 9, 6]}
          icon={Target}
          iconColor="#0284C7"
          iconBg="bg-sky-50 dark:bg-sky-950/40"
        />

        {/* Card 4: Oportunidades detectadas */}
        <MetricCard
          label="Oportunidades detectadas"
          value={detectedOpportunitiesCount}
          trendText="↑ 37%"
          trendSubtext="Temas sugeridos para tu próximo video"
          trendPositive={true}
          sparklineColor="#8B5CF6"
          sparklinePoints={[16, 14, 11, 13, 10, 7, 3]}
          icon={Lightbulb}
          iconColor="#8B5CF6"
          iconBg="bg-purple-50 dark:bg-purple-950/40"
        />
      </div>

      {/* Row 1: Alertas accionables (Left) + Análisis de sentimiento (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Alertas accionables (Col 7) */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Flame size={14} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Alertas accionables
                </h3>
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </div>
              <button
                onClick={() => setTab('alerts')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver todas
              </button>
            </div>

            {/* Alert List */}
            <div className="space-y-3">
              {/* Alert 1 */}
              <div
                onClick={() => setTab('alerts')}
                className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Flame size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                      Aumento de preguntas sobre &ldquo;herramientas de IA&rdquo;
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+312%</span> en los últimos 7 días • 48 comentarios
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                    Alta prioridad
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Alert 2 */}
              <div
                onClick={() => setTab('alerts')}
                className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-950/40 bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                    <Meh size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">
                      Sentimiento negativo sobre la edición del video
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Menciones de &ldquo;muy largo&rdquo;, &ldquo;podría ser más corto&rdquo;
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                    Revisar
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Alert 3 */}
              <div
                onClick={() => setTab('alerts')}
                className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                      Nuevo tema en tendencia: &ldquo;automatización con IA&rdquo;
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Múltiples usuarios piden tutoriales paso a paso
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                    Oportunidad
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Análisis de sentimiento (Col 5) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Análisis de sentimiento
              </h3>
            </div>

            {/* Donut Chart & Legend */}
            <div className="flex items-center justify-around gap-4 py-2">
              <DesignDonutChart
                sizeClass="w-32 h-32"
                centerLabel={`${positiveSentiment}%`}
                centerSub="Positivo"
                centerLabelClass="text-2xl font-black text-slate-900 dark:text-white leading-none"
                centerSubClass="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1"
                segments={[
                  { percentage: positiveSentiment, color: '#10B981' },
                  { percentage: neutralSentiment, color: '#94A3B8' },
                  { percentage: negativeSentiment, color: '#EF4444' },
                ]}
              />

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 w-16">Positivo</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{positiveSentiment}%</span>
                  <span className="text-slate-400 text-[11px]">(6,621)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 w-16">Neutro</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{neutralSentiment}%</span>
                  <span className="text-slate-400 text-[11px]">(1,274)</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 w-16">Negativo</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{negativeSentiment}%</span>
                  <span className="text-slate-400 text-[11px]">(597)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Highlight text & mini sparkline */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 mt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              El sentimiento general ha mejorado <strong className="text-emerald-600 dark:text-emerald-400 font-bold">un 12%</strong> en comparación con los últimos 28 días.
            </p>
            <div className="w-20 h-6 flex-shrink-0">
              <svg className="w-full h-full" viewBox="0 0 60 20" fill="none">
                <path
                  d="M2 15 Q15 14 25 10 T45 6 T58 3"
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Temas más comentados (Left) + Oportunidades de contenido (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Temas más comentados (Col 6) */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Temas más comentados
              </h3>
            </div>
            <button
              onClick={() => setTab('comments')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          {/* Ranked Topics List */}
          <div className="space-y-3.5">
            {[
              {
                rank: 1,
                rankColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40',
                title: 'Herramientas de IA',
                subtitle: '2,843 comentarios • 33%',
                growth: '↑ 41%',
                growthColor: 'text-emerald-600 dark:text-emerald-400',
                sparklinePath: 'M2 15 Q15 14 30 9 T58 4',
                sparkColor: '#10B981',
              },
              {
                rank: 2,
                rankColor: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/40',
                title: 'Productividad y organización',
                subtitle: '1,521 comentarios • 18%',
                growth: '↑ 28%',
                growthColor: 'text-emerald-600 dark:text-emerald-400',
                sparklinePath: 'M2 16 Q15 12 32 10 T58 5',
                sparkColor: '#3B82F6',
              },
              {
                rank: 3,
                rankColor: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/40',
                title: 'Edición de video',
                subtitle: '1,287 comentarios • 15%',
                growth: '↑ 12%',
                growthColor: 'text-emerald-600 dark:text-emerald-400',
                sparklinePath: 'M2 14 Q20 15 35 11 T58 7',
                sparkColor: '#8B5CF6',
              },
              {
                rank: 4,
                rankColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
                title: 'Tutoriales paso a paso',
                subtitle: '964 comentarios • 11%',
                growth: '↑ 36%',
                growthColor: 'text-emerald-600 dark:text-emerald-400',
                sparklinePath: 'M2 17 Q18 13 36 9 T58 4',
                sparkColor: '#F59E0B',
              },
              {
                rank: 5,
                rankColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
                title: 'Otros temas',
                subtitle: '877 comentarios • 10%',
                growth: '↓ 6%',
                growthColor: 'text-rose-500',
                sparklinePath: 'M2 6 Q20 8 38 12 T58 16',
                sparkColor: '#94A3B8',
              },
            ].map((topic) => (
              <div
                key={topic.rank}
                className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${topic.rankColor} flex-shrink-0`}
                  >
                    {topic.rank}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{topic.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className={`text-xs font-bold ${topic.growthColor}`}>
                    {topic.growth}
                  </span>
                  <div className="w-16 h-5">
                    <svg className="w-full h-full" viewBox="0 0 60 20" fill="none">
                      <path
                        d={topic.sparklinePath}
                        stroke={topic.sparkColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Oportunidades de contenido (Col 6) */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Oportunidades de contenido
              </h3>
            </div>
            <button
              onClick={() => setTab('ideas')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          {/* Opportunity Items */}
          <div className="space-y-3">
            {[
              {
                id: 'opp-1',
                icon: FileText,
                iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
                title: 'Guía práctica: Automatiza tu trabajo con IA',
                subtitle: 'Tema en tendencia • Alta demanda',
                tag: 'Oportunidad',
                tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
                description: 'La audiencia solicita un paso a paso concreto de herramientas como ChatGPT, Make y Notion AI integradas en el flujo diario.',
                hook: '«Si todavía haces esto a mano, estás perdiendo 3 horas al día...»',
              },
              {
                id: 'opp-2',
                icon: AlertCircle,
                iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
                title: 'Errores comunes al editar videos',
                subtitle: 'Mucha interacción • Audiencia pidiendo ayuda',
                tag: 'Oportunidad',
                tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
                description: 'Detectamos 38 comentarios preguntando por qué sus videos pierden retención en los primeros 30 segundos.',
                hook: '«El 90% de los creadores arruinan su video en los primeros 10 segundos con este error de corte.»',
              },
              {
                id: 'opp-3',
                icon: Layers,
                iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
                title: 'Comparativa de herramientas de IA',
                subtitle: 'Comentarios con muchas dudas y comparaciones',
                tag: 'Tendencia',
                tagColor: 'bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40',
                description: 'Comparativa cara a cara entre Claude 3.5 Sonnet vs GPT-4o para creadores de contenido.',
                hook: '«Puse a prueba las 2 IAs más potentes para escribir guiones y el resultado me sorprendió...»',
              },
              {
                id: 'opp-4',
                icon: Heart,
                iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
                title: 'Cómo mantener la motivación al crear contenido',
                subtitle: 'Preguntas recurrentes • Gran engagement',
                tag: 'Oportunidad',
                tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
                description: 'Muchos creadores en tus comentarios sufren de burnout o inconsistencia tras los primeros 10 videos.',
                hook: '«Este es el sistema que uso para publicar sin depender de la motivación.»',
              },
              {
                id: 'opp-5',
                icon: Zap,
                iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
                title: 'Edición rápida con IA (menos de 10 min)',
                subtitle: 'Alta retención • Muchos guardados',
                tag: 'Tendencia',
                tagColor: 'bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40',
                description: 'Flujo de trabajo acelerado usando subtítulos automáticos, cortes de silencios y b-roll generado.',
                hook: '«Cómo edito un video completo de YouTube en menos de 10 minutos usando solo IA.»',
              },
            ].map((opp) => {
              const Icon = opp.icon;
              return (
                <div
                  key={opp.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${opp.iconBg}`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {opp.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{opp.subtitle}</p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.2 rounded-full text-[9px] font-bold border ${opp.tagColor}`}
                      >
                        {opp.tag}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() =>
                        setSelectedIdeaModal({
                          title: opp.title,
                          tag: opp.tag,
                          subtitle: opp.subtitle,
                          description: opp.description,
                          hook: opp.hook,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors"
                    >
                      Ver idea
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Rendimiento de videos (Left) + Demografía de la audiencia (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Rendimiento de videos (Col 6) */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rendimiento de videos
              </h3>
            </div>
            <button
              onClick={() => setTab('trends')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos
            </button>
          </div>

          {/* Videos Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <th className="pb-2.5 font-semibold">Video</th>
                  <th className="pb-2.5 font-semibold text-center">Comentarios</th>
                  <th className="pb-2.5 font-semibold text-center">Sentimiento</th>
                  <th className="pb-2.5 font-semibold text-center">Oportunidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[
                  {
                    title: 'Cómo usar IA para ser más productivo',
                    meta: '128K vistas • hace 5 días',
                    comments: '1,248',
                    sentiment: '82%',
                    opportunities: '5',
                    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=160&h=90&q=80',
                  },
                  {
                    title: '5 herramientas de IA que debes probar',
                    meta: '98K vistas • hace 10 días',
                    comments: '964',
                    sentiment: '76%',
                    opportunities: '4',
                    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=160&h=90&q=80',
                  },
                  {
                    title: 'Errores de programación que debes evitar',
                    meta: '76K vistas • hace 2 semanas',
                    comments: '642',
                    sentiment: '71%',
                    opportunities: '3',
                    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=160&h=90&q=80',
                  },
                  {
                    title: 'Cómo crear un chatbot con IA',
                    meta: '54K vistas • hace 3 semanas',
                    comments: '438',
                    sentiment: '68%',
                    opportunities: '2',
                    thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=160&h=90&q=80',
                  },
                ].map((video, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <VideoThumbnail
                          src={video.thumbnail}
                          title={video.title}
                          className="w-12 h-8 rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs group-hover:text-blue-600 transition-colors">
                            {video.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{video.meta}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      {video.comments}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                        {video.sentiment}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/40">
                        {video.opportunities}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Demografía de la audiencia (Col 6) */}
        <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Demografía de la audiencia
                </h3>
              </div>
              <button
                onClick={() => setTab('competitors')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ver más
              </button>
            </div>

            {/* Demographic Tabs Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl max-w-xs mb-4">
              {(['edad', 'genero', 'ubicacion'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDemographicsTab(tab)}
                  className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold capitalize transition-all ${
                    demographicsTab === tab
                      ? 'bg-white dark:bg-[#151C30] text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {tab === 'edad' ? 'Edad' : tab === 'genero' ? 'Género' : 'Ubicación'}
                </button>
              ))}
            </div>

            {/* Tab: Edad */}
            {demographicsTab === 'edad' && (
              <div className="space-y-2.5">
                {[
                  { range: '13–17', pct: 8, isTop: false },
                  { range: '18–24', pct: 28, isTop: false },
                  { range: '25–34', pct: 34, isTop: true },
                  { range: '35–44', pct: 18, isTop: false },
                  { range: '45–54', pct: 9, isTop: false },
                  { range: '55+', pct: 3, isTop: false },
                ].map((item) => (
                  <div key={item.range} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-slate-500 dark:text-slate-400 font-medium">
                      {item.range}
                    </span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.isTop
                            ? 'bg-[#6366F1] shadow-sm shadow-indigo-500/30'
                            : 'bg-[#818CF8]'
                        }`}
                        style={{ width: `${item.pct * 2.8}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-slate-800 dark:text-slate-200">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Género */}
            {demographicsTab === 'genero' && (
              <div className="space-y-4 py-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Masculino</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">68%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500" style={{ width: '68%' }} />
                  <div className="h-full bg-pink-500" style={{ width: '32%' }} />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Femenino</span>
                  <span className="font-bold text-pink-500">32%</span>
                </div>
              </div>
            )}

            {/* Tab: Ubicación */}
            {demographicsTab === 'ubicacion' && (
              <div className="space-y-2.5">
                {[
                  { country: 'España', pct: 38 },
                  { country: 'México', pct: 26 },
                  { country: 'Colombia', pct: 14 },
                  { country: 'Argentina', pct: 12 },
                  { country: 'Otros países', pct: 10 },
                ].map((item) => (
                  <div key={item.country} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-slate-500 dark:text-slate-400 font-medium truncate">
                      {item.country}
                    </span>
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${item.pct * 2.5}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-slate-800 dark:text-slate-200">
                      {item.pct}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Recomendaciones personalizadas (Bottom Full Width) */}
      <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recomendaciones personalizadas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Basadas en el análisis de comentarios, tendencias y el comportamiento de tu audiencia.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('opportunities')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all self-start lg:self-auto"
          >
            Ver todas las recomendaciones
          </button>
        </div>

        {/* 3 Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
            <div>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center mb-2.5">
                <Target size={14} />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Enfócate en tutoriales prácticos
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Los videos con guías paso a paso tienen un <strong className="text-emerald-600 dark:text-emerald-400 font-bold">43%</strong> más de engagement.
              </p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                Alta prioridad
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
            <div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center mb-2.5">
                <Clock size={14} />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Reduce la duración de los videos
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tus videos de más de 12 min reciben un <strong className="text-rose-500 font-bold">28%</strong> menos de retención.
              </p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                Media prioridad
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between gap-3">
            <div>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center mb-2.5">
                <BarChart2 size={14} />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Agrega más ejemplos reales
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Los usuarios piden más casos prácticos y ejemplos del mundo real en los comentarios.
              </p>
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                Media prioridad
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Idea Detail Modal */}
      {selectedIdeaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121624] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedIdeaModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                {selectedIdeaModal.tag}
              </span>
              <span className="text-xs text-slate-400">{selectedIdeaModal.subtitle}</span>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
              {selectedIdeaModal.title}
            </h3>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <h5 className="font-bold text-slate-900 dark:text-white mb-1">Por qué funcionará:</h5>
                <p className="leading-relaxed">{selectedIdeaModal.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <h5 className="font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                  <Zap size={14} /> Gancho de apertura sugerido (Hook):
                </h5>
                <p className="italic leading-relaxed text-blue-950 dark:text-blue-100 font-medium">
                  {selectedIdeaModal.hook}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedIdeaModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleSaveIdea(selectedIdeaModal.title);
                  setSelectedIdeaModal(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <Bookmark size={14} />
                Guardar en Ideas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Idea Toast Notification */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            Idea guardada con éxito en tu baúl
          </span>
        </div>
      )}

      {/* Add Channel Modal */}
      <AddChannelModal
        open={showAddChannelModal}
        onClose={() => setShowAddChannelModal(false)}
        onSubmit={addOwnChannel}
        title="Agregar canal de YouTube"
        description="Ingresa el handle o URL de tu canal para sincronizar métricas y comentarios."
        submitLabel="Vincular canal"
      />
    </div>
  );
};
