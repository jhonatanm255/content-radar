import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Users,
  MessageCircle,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Video,
} from 'lucide-react';
import { useAppStore, getActiveOwnChannel } from '../store/appStore';
import { Comment, TrackedVideo } from '../../domain/entities';
import { ActionableAlert } from '../../domain/commentAnalysis';
import {
  LATEST_VIDEOS_LIMIT,
  MAX_COMMENTS_BULK_PER_VIDEO,
  MAX_COMMENTS_SELECTED_CAP,
} from '../../application/analyze-comments';
import { VideoEngagementBadge } from '../components/VideoEngagementBadge';
import { StrategicReportViewer } from '../components/StrategicReportViewer';
import { DesignDonutChart } from '../components/charts/DesignDonutChart';

const TOPIC_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('es-ES');
}

function AlertCard({ alert }: { alert: ActionableAlert }) {
  const icons = {
    problema: AlertTriangle,
    pregunta: HelpCircle,
    sugerencia: Lightbulb,
    sentimiento: TrendingUp,
    actividad: MessageCircle,
  };
  const colors = {
    alta: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20',
    media: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20',
    baja: 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20',
  };
  const Icon = icons[alert.type];

  return (
    <div className={`p-4 rounded-xl border ${colors[alert.priority]}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="text-violet-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{alert.title}</p>
          <p className="text-xs text-slate-600 dark:text-cr-muted mt-1">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function VideoStatusBadge({ video }: { video: TrackedVideo }) {
  if (video.analysisStatus === 'done' && video.commentsAnalyzedAt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={10} />
        Analizado
      </span>
    );
  }
  if (video.analysisStatus === 'analyzing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-indigo-400">
        <Loader2 size={10} className="animate-spin" />
        Analizando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-cr-elevated-dark text-slate-500 dark:text-cr-muted">
      <Clock size={10} />
      Pendiente
    </span>
  );
}

function CommentList({ comments, emptyMessage }: { comments: Comment[]; emptyMessage: string }) {
  if (comments.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-cr-muted py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-cr-border-dark/60 text-xs">
      {comments.slice(0, 20).map((comment) => (
        <div
          key={comment.id}
          className="py-3 px-2 hover:bg-slate-50/50 dark:hover:bg-white/[0.04]/10 rounded-lg transition-colors"
        >
          <p className="text-slate-700 dark:text-cr-muted">{comment.text}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {comment.authorName} · {new Date(comment.publishedAt).toLocaleDateString('es-ES')}
          </p>
        </div>
      ))}
    </div>
  );
}

export const CommentsAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'temas' | 'preguntas' | 'problemas' | 'sugerencias'
  >('resumen');

  const {
    channels,
    selectedChannelId,
    commentAnalysis,
    isAnalyzingComments,
    analyzeCommentsProgress,
    analyzeCommentsStep,
    analyzeCommentsError,
    youtubeApiConfigured,
    channelVideos,
    isLoadingChannelVideos,
    selectedYoutubeVideoIds,
    commentViewFilter,
    loadCommentAnalysis,
    loadChannelVideos,
    toggleVideoSelection,
    clearVideoSelection,
    setCommentViewFilter,
    analyzeComments,
  } = useAppStore();

  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  useEffect(() => {
    if (activeChannel) {
      loadChannelVideos();
      loadCommentAnalysis();
    }
  }, [activeChannel?.id, loadChannelVideos, loadCommentAnalysis]);

  const hasData = commentAnalysis && commentAnalysis.stats.totalComments > 0;
  const stats = commentAnalysis?.stats ?? {
    totalComments: 0,
    totalAvailable: 0,
    coveragePercent: 0,
    uniqueUsers: 0,
    commentsPerDay: 0,
    averageEngagement: 0,
  };
  const sentiment = commentAnalysis?.contentSentiment ??
    commentAnalysis?.sentiment ?? { positive: 0, neutral: 0, negative: 0 };
  const resonance = commentAnalysis?.resonance ?? { count: 0, percentage: 0 };
  const resonantHooks = commentAnalysis?.resonantHooks ?? [];
  const topics = commentAnalysis?.topics ?? [];
  const faqs = commentAnalysis?.faqs ?? [];
  const alerts = commentAnalysis?.alerts ?? [];

  const sentimentSegments = [
    { percentage: sentiment.positive, color: '#10b981' },
    { percentage: sentiment.neutral, color: '#f59e0b' },
    { percentage: sentiment.negative, color: '#ef4444' },
  ].filter((s) => s.percentage > 0);

  const tabComments: Comment[] =
    activeTab === 'preguntas'
      ? commentAnalysis?.commentsByCategory.pregunta ?? []
      : activeTab === 'problemas'
        ? commentAnalysis?.commentsByCategory.problema ?? []
        : activeTab === 'sugerencias'
          ? commentAnalysis?.commentsByCategory.sugerencia ?? []
          : [];

  return (
    <div className="cr-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Análisis de Comentarios
          </h1>
          <p className="text-slate-500 dark:text-cr-muted text-sm mt-1">
            {activeChannel
              ? selectedYoutubeVideoIds.length > 0
                ? `${selectedYoutubeVideoIds.length} video(s) seleccionado(s) · catálogo de ${channelVideos.length} videos`
                : `Análisis por defecto: últimos ${LATEST_VIDEOS_LIMIT} videos de ${activeChannel.name}`
              : 'Vincula un canal para analizar comentarios'}
          </p>
          {commentAnalysis?.lastAnalyzedAt && (
            <p className="text-[11px] text-slate-400 mt-1">
              Último análisis:{' '}
              {new Date(commentAnalysis.lastAnalyzedAt).toLocaleString('es-ES')}
              {commentAnalysis.analysisEngine && (
                <span className="ml-2 inline-flex items-center rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cr-accent dark:text-indigo-400">
                  Motor: {commentAnalysis.analysisEngine === 'pysentimiento' ? 'IA (pysentimiento)' : commentAnalysis.analysisEngine}
                </span>
              )}
            </p>
          )}
          {commentAnalysis?.analysisReport && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-cr-elevated-dark border border-slate-200 dark:border-cr-border-dark text-sm leading-relaxed whitespace-pre-line">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2">
                Resumen del lote {commentAnalysis.analysisEngine ? `(${commentAnalysis.analysisEngine === 'deepseek-chat' ? 'Deep Seek' : commentAnalysis.analysisEngine === 'gemini' ? 'Gemini' : commentAnalysis.analysisEngine})` : ''}
              </h2>
              <p className="text-slate-600 dark:text-cr-muted">
                {commentAnalysis.analysisReport}
              </p>
            </div>
          )}

          {commentAnalysis?.strategicReport && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  📈 Análisis Estratégico Profundo
                </h2>
                <p className="text-xs text-slate-500 dark:text-cr-muted">
                  Reporte ejecutivo completo con alertas, oportunidades y recomendaciones
                </p>
              </div>
              <div className="bg-white dark:bg-cr-elevated-dark rounded-xl border border-slate-200 dark:border-cr-border-dark p-6">
                <StrategicReportViewer report={commentAnalysis.strategicReport} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2 sm:flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => analyzeComments('latest')}
              disabled={!activeChannel || isAnalyzingComments || !youtubeApiConfigured}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cr-accent hover:bg-cr-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-md shadow-indigo-500/20"
            >
              {isAnalyzingComments ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {isAnalyzingComments ? 'Analizando…' : `Últimos ${LATEST_VIDEOS_LIMIT}`}
            </button>
            <button
              onClick={() => analyzeComments('selected')}
              disabled={
                !activeChannel ||
                isAnalyzingComments ||
                !youtubeApiConfigured ||
                selectedYoutubeVideoIds.length === 0
              }
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-cr-elevated-dark border border-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-50 disabled:cursor-not-allowed text-violet-700 dark:text-violet-300 text-sm font-bold transition-colors"
            >
              <Video size={16} />
              Seleccionados ({selectedYoutubeVideoIds.length})
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-left sm:text-right max-w-sm">
            <span className="font-semibold text-cr-accent dark:text-indigo-400">Seleccionados:</span>{' '}
            todos los comentarios del video (hasta {formatNumber(MAX_COMMENTS_SELECTED_CAP)}).{' '}
            <span className="font-semibold">Últimos {LATEST_VIDEOS_LIMIT}:</span> máx.{' '}
            {MAX_COMMENTS_BULK_PER_VIDEO} por video.
          </p>
        </div>
      </div>

      {activeChannel && (
        <div className="mb-6 p-4 cr-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Seleccionar videos para analizar
            </h2>
            {selectedYoutubeVideoIds.length > 0 && (
              <button
                onClick={clearVideoSelection}
                className="text-xs font-semibold text-slate-500 hover:text-cr-accent dark:hover:text-indigo-400 transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {isLoadingChannelVideos ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <Loader2 size={16} className="animate-spin" />
              Cargando videos del canal…
            </div>
          ) : channelVideos.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              No hay videos disponibles. Pulsa analizar para sincronizar el catálogo.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {channelVideos.map((video) => {
                const isSelected = selectedYoutubeVideoIds.includes(video.youtubeVideoId);
                return (
                  <label
                    key={video.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVideoSelection(video.youtubeVideoId)}
                      className="rounded border-slate-300 text-cr-accent focus:ring-violet-500"
                    />
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="w-16 h-9 object-cover rounded-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-9 bg-slate-200 dark:bg-cr-elevated-dark rounded-md flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {video.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(video.publishedAt).toLocaleDateString('es-ES')} ·{' '}
                        {formatNumber(video.viewCount)} vistas ·{' '}
                        {formatNumber(video.commentCount)} comentarios
                      </p>
                      <VideoEngagementBadge
                        likes={video.likeCount}
                        dislikes={video.dislikeCount}
                        compact
                      />
                    </div>
                    <VideoStatusBadge video={video} />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isAnalyzingComments && (
        <div className="mb-6 p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
              {analyzeCommentsStep}
            </p>
            <span className="text-xs font-bold text-cr-accent dark:text-indigo-400">
              {analyzeCommentsProgress}%
            </span>
          </div>
          <div className="h-2 bg-violet-200 dark:bg-violet-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-cr-accent rounded-full transition-all duration-300"
              style={{ width: `${analyzeCommentsProgress}%` }}
            />
          </div>
        </div>
      )}

      {analyzeCommentsError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
          {analyzeCommentsError}
        </div>
      )}

      {!activeChannel && (
        <div className="p-8 cr-card text-center">
          <p className="text-slate-600 dark:text-cr-muted">
            Ve a Ajustes y vincula tu canal de YouTube para comenzar.
          </p>
        </div>
      )}

      {activeChannel && !hasData && !isAnalyzingComments && (
        <div className="p-8 cr-card text-center">
          <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-cr-muted-fg mb-3" />
          <p className="text-slate-600 dark:text-cr-muted mb-4">
            Selecciona uno o más videos arriba y pulsa &quot;Seleccionados&quot;, o usa
            &quot;Últimos {LATEST_VIDEOS_LIMIT}&quot; para analizar los más recientes.
          </p>
        </div>
      )}

      {(hasData || isAnalyzingComments) && activeChannel && (
        <>
          {commentAnalysis && commentAnalysis.trackedVideos.some((v) => v.analysisStatus === 'done') && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 dark:text-cr-muted whitespace-nowrap">
                Ver resumen de:
              </label>
              <select
                value={commentViewFilter}
                onChange={(e) => setCommentViewFilter(e.target.value as 'all' | string)}
                className="flex-1 max-w-md text-sm rounded-lg border border-slate-200 dark:border-cr-border-dark bg-white dark:bg-cr-elevated-dark text-slate-800 dark:text-slate-100 px-3 py-2"
              >
                <option value="all">Todos los videos analizados</option>
                {channelVideos
                  .filter((v) => v.analysisStatus === 'done')
                  .map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.title.slice(0, 70)}
                      {video.title.length > 70 ? '…' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="shrink-0 border-b border-slate-200 dark:border-cr-border-dark pb-3 mb-6">
            <div className="flex gap-2 overflow-x-auto">
            {(['resumen', 'temas', 'preguntas', 'problemas', 'sugerencias'] as const).map((tab) => {
              const labels = {
                resumen: 'Resumen',
                temas: 'Temas',
                preguntas: 'Preguntas',
                problemas: 'Problemas',
                sugerencias: 'Sugerencias',
              };
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`cr-tab ${isActive ? 'cr-tab-active' : 'cr-tab-inactive'}`}
                >
                  {labels[tab]}
                </button>
              );
            })}
            </div>
          </div>

          {activeTab === 'resumen' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[
                  {
                    label: 'Comentarios analizados',
                    value: formatNumber(stats.totalComments),
                    sub:
                      stats.totalAvailable > stats.totalComments
                        ? `de ${formatNumber(stats.totalAvailable)} en YouTube (${stats.coveragePercent}%)`
                        : stats.totalAvailable > 0 && stats.coveragePercent < 100
                          ? `${stats.coveragePercent}% del total`
                          : undefined,
                    icon: MessageSquare,
                    color: 'text-violet-500 bg-violet-500/10',
                  },
                  {
                    label: 'Usuarios únicos',
                    value: formatNumber(stats.uniqueUsers),
                    icon: Users,
                    color: 'text-blue-500 bg-blue-500/10',
                  },
                  {
                    label: 'Comentarios por día',
                    value: formatNumber(stats.commentsPerDay),
                    icon: MessageCircle,
                    color: 'text-emerald-500 bg-emerald-500/10',
                  },
                  {
                    label: 'Interacción promedio',
                    value: String(stats.averageEngagement),
                    icon: BarChart3,
                    color: 'text-amber-500 bg-amber-500/10',
                  },
                ].map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={index}
                      className="cr-card cr-card-pad flex items-center gap-4"
                    >
                      <div className={`p-3 rounded-lg ${card.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-cr-muted-fg uppercase tracking-wider">
                          {card.label}
                        </p>
                        <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                          {card.value}
                        </p>
                        {'sub' in card && card.sub && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {stats.totalAvailable > stats.totalComments && stats.totalComments > 0 && (
                <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                  Solo se analizaron {formatNumber(stats.totalComments)} de{' '}
                  {formatNumber(stats.totalAvailable)} comentarios. Selecciona el video y pulsa{' '}
                  <strong>Analizar seleccionados</strong> para un análisis completo.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                <div className="lg:col-span-6 cr-card cr-card-pad">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                    Ideas y temas accionables
                  </h2>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Sugerencias, preguntas y hooks con potencial para nuevo contenido
                  </p>
                  {topics.length > 0 ? (
                    <div className="space-y-3">
                      {topics.map((topic, i) => (
                        <div
                          key={topic.name}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-cr-elevated-dark/40 border border-slate-100 dark:border-cr-border-dark/60"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded mt-1 flex-shrink-0"
                            style={{ backgroundColor: TOPIC_COLORS[i % TOPIC_COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-800 dark:text-white">
                                {topic.name}
                              </span>
                              <span className="text-xs font-bold text-cr-accent dark:text-indigo-400">
                                {topic.count} · {topic.percentage}%
                              </span>
                            </div>
                            {topic.insight && (
                              <p className="text-[11px] text-slate-500 dark:text-cr-muted mt-0.5">
                                {topic.insight}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Sin temas accionables aún. Analiza más videos o espera sugerencias/preguntas de la audiencia.
                    </p>
                  )}
                </div>

                <div className="lg:col-span-6 cr-card cr-card-pad">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                      Sentimiento hacia tu contenido
                    </h2>
                    <div className="flex gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-emerald-500" /> Positivo
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-amber-500" /> Neutral
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-red-500" /> Negativo
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Excluye comentarios que solo repiten el hook del video
                    {resonance.count > 0 && (
                      <span className="text-violet-500 font-semibold">
                        {' '}
                        · {resonance.count} eco(s) del título ({resonance.percentage}%)
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-6">
                    {sentimentSegments.length > 0 ? (
                      <DesignDonutChart
                        sizeClass="w-36 h-36"
                        segments={sentimentSegments}
                        centerLabel={`${sentiment.positive}%`}
                        centerSub="apoyo"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">Sin datos de sentimiento.</p>
                    )}
                    <div className="flex-1 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-600">Apoyo / positivo</span>
                        <span className="font-bold">{sentiment.positive}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-600">Neutral</span>
                        <span className="font-bold">{sentiment.neutral}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Crítica</span>
                        <span className="font-bold">{sentiment.negative}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {resonantHooks.length > 0 && (
                <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-900/70 border border-violet-200/60 dark:border-violet-800/40 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                    Hooks que resonaron
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-cr-muted mb-4">
                    La audiencia repite estos temas del video — señal de engagement, no de crítica
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resonantHooks.map((hook) => (
                      <div
                        key={`${hook.videoId}-${hook.hook}`}
                        className="p-3 rounded-lg bg-white/80 dark:bg-cr-card-dark/60 border border-violet-100 dark:border-violet-900/40"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                            {hook.hook}
                          </span>
                          <span className="text-xs font-extrabold text-slate-600 dark:text-cr-muted">
                            {hook.count} comentarios
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate" title={hook.videoTitle}>
                          Video: {hook.videoTitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alerts.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
                    Alertas accionables
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {alerts.slice(0, 6).map((alert) => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              )}

              <div className="cr-card cr-card-pad">
                <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
                  Preguntas más frecuentes
                </h2>
                {faqs.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-cr-border-dark/60 text-xs">
                    {faqs.map((item, index) => (
                      <div
                        key={index}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.04]/10 px-2 rounded-lg transition-colors"
                      >
                        <span className="text-slate-700 dark:text-cr-muted font-semibold">
                          {item.text}
                        </span>
                        <span className="font-extrabold text-slate-850 dark:text-white bg-slate-50 dark:bg-cr-elevated-dark border border-slate-200/50 dark:border-cr-border-dark px-2 py-0.5 rounded shadow-sm">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No se detectaron preguntas frecuentes.</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'temas' && (
            <div className="cr-card cr-card-pad">
              <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">
                Temas detectados en comentarios
              </h2>
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div
                    key={topic.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-cr-elevated-dark/40"
                  >
                    <span className="text-sm font-semibold text-slate-700 dark:text-cr-muted">
                      {topic.name}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-cr-accent dark:text-indigo-400">
                        {topic.count} menciones
                      </span>
                      <span className="text-xs text-slate-400 ml-2">({topic.percentage}%)</span>
                    </div>
                  </div>
                ))}
                {topics.length === 0 && (
                  <p className="text-sm text-slate-500">Sin temas detectados.</p>
                )}
              </div>
            </div>
          )}

          {['preguntas', 'problemas', 'sugerencias'].includes(activeTab) && (
            <div className="cr-card cr-card-pad">
              <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 capitalize">
                {activeTab}
              </h2>
              <CommentList
                comments={tabComments}
                emptyMessage={`No hay comentarios de tipo "${activeTab}" en el análisis actual.`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
