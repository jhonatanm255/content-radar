import React, { useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Gauge,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  Megaphone,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { useAppStore, getActiveOwnChannel } from '../store/appStore';
import { Comment, TrackedVideo } from '../../domain/entities';
import {
  ActionableAlert,
  DecisionInsight,
  StrategicReport,
  TopicMention,
  VideoAnalysisInsight,
} from '../../domain/commentAnalysis';
import {
  LATEST_VIDEOS_LIMIT,
  MAX_COMMENTS_BULK_PER_VIDEO,
  MAX_COMMENTS_SELECTED_CAP,
} from '../../application/analyze-comments';
import { VideoEngagementBadge } from '../components/VideoEngagementBadge';
import { DesignDonutChart } from '../components/charts/DesignDonutChart';
import { RankedProgressList } from '../components/charts/RankedProgressList';

const TOPIC_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('es-ES');
}

function formatEngine(engine?: string): string | undefined {
  if (!engine) return undefined;
  if (engine === 'pysentimiento') return 'IA (pysentimiento)';
  if (engine === 'deepseek-chat') return 'Deep Seek';
  if (engine === 'gemini') return 'Gemini';
  return engine;
}

function compactText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function getSignalLabel(
  sentiment: { positive: number; neutral: number; negative: number },
  alerts: ActionableAlert[],
  strategicReport?: StrategicReport
): { label: string; tone: string; detail: string } {
  const severeStrategicAlerts = strategicReport?.actionable_alerts?.filter((a) => a.severity === 'ROJA').length ?? 0;
  const highAlerts = alerts.filter((a) => a.priority === 'alta').length + severeStrategicAlerts;

  if (highAlerts > 0 || sentiment.negative >= 30) {
    return {
      label: 'Revisar fricciones',
      tone: 'text-red-600 dark:text-red-400 bg-red-500/10',
      detail: 'Hay críticas o problemas que conviene atender antes de publicar más sobre lo mismo.',
    };
  }

  if (sentiment.positive >= 55) {
    return {
      label: 'Comunidad receptiva',
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
      detail: 'La conversación está inclinada al apoyo; buen momento para convertir preguntas en contenido.',
    };
  }

  return {
    label: 'Señales mixtas',
    tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    detail: 'Hay interés, pero todavía necesitas separar curiosidad, dudas y objeciones.',
  };
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
    alta: 'border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20',
    media: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20',
    baja: 'border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/20',
  };
  const Icon = icons[alert.type];

  return (
    <div className={`p-4 rounded-lg border ${colors[alert.priority]}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className="text-slate-700 dark:text-slate-200 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 dark:text-white">{alert.title}</p>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-cr-muted-fg">
              {alert.priority}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-cr-muted mt-1 leading-relaxed">{alert.description}</p>
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

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="cr-card p-4 min-h-[132px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <p className="cr-label leading-tight">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
        {detail && <p className="text-xs text-slate-500 dark:text-cr-muted mt-1 leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  eyebrow,
  icon: Icon,
}: {
  title: string;
  eyebrow?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-cr-elevated-dark flex items-center justify-center text-slate-600 dark:text-cr-muted">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        {eyebrow && <p className="text-xs text-slate-500 dark:text-cr-muted mt-0.5">{eyebrow}</p>}
      </div>
    </div>
  );
}

function TopicRow({ topic, index, maxCount }: { topic: TopicMention; index: number; maxCount: number }) {
  const width = Math.max(6, (topic.count / Math.max(maxCount, 1)) * 100);
  const sourceLabels: Record<NonNullable<TopicMention['source']>, string> = {
    sugerencia: 'Pedido',
    pregunta: 'Duda',
    problema: 'Fricción',
    tema_video: 'Tema del video',
    nicho: 'Conversación',
    resonancia: 'Hook',
  };

  return (
    <div className="rounded-lg border border-slate-100 dark:border-cr-border-dark bg-white dark:bg-cr-card-dark p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: TOPIC_COLORS[index % TOPIC_COLORS.length] }}
            />
            <p className="text-sm font-bold text-slate-850 dark:text-white truncate">{topic.name}</p>
          </div>
          {topic.insight && (
            <p className="text-[11px] text-slate-500 dark:text-cr-muted mt-1 leading-relaxed">{topic.insight}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{topic.count}</p>
          <p className="text-[10px] text-slate-400">{topic.percentage}%</p>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-cr-elevated-dark overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: TOPIC_COLORS[index % TOPIC_COLORS.length] }}
        />
      </div>
      {topic.source && (
        <span className="inline-flex mt-2 text-[10px] font-bold text-slate-500 dark:text-cr-muted-fg bg-slate-100 dark:bg-cr-elevated-dark px-2 py-0.5 rounded-md">
          {sourceLabels[topic.source]}
        </span>
      )}
    </div>
  );
}

function CommentPreview({
  title,
  comments,
  emptyMessage,
  icon: Icon,
}: {
  title: string;
  comments: Comment[];
  emptyMessage: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 dark:border-cr-border-dark bg-white dark:bg-cr-card-dark p-4 min-h-[260px]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-500 dark:text-cr-muted" />
          <h3 className="text-sm font-bold text-slate-850 dark:text-white">{title}</h3>
        </div>
        <span className="text-[10px] font-extrabold text-slate-500 dark:text-cr-muted-fg bg-slate-100 dark:bg-cr-elevated-dark px-2 py-0.5 rounded-md">
          {comments.length}
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-cr-muted py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {comments.slice(0, 4).map((comment) => (
            <div key={comment.id} className="border-t border-slate-100 dark:border-cr-border-dark/60 pt-3 first:border-t-0 first:pt-0">
              <p className="text-xs text-slate-700 dark:text-cr-muted leading-relaxed line-clamp-3">{comment.text}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                {comment.authorName} · {new Date(comment.publishedAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionInsightCard({ insight }: { insight: DecisionInsight }) {
  const tone = {
    alta: 'border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 text-red-600 dark:text-red-400',
    media: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    baja: 'border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400',
  };
  const typeLabel = {
    crear: 'Crear',
    responder: 'Responder',
    corregir: 'Corregir',
    duplicar: 'Duplicar',
  };

  return (
    <div className={`rounded-lg border p-4 ${tone[insight.priority]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wide">
              {typeLabel[insight.type]}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-cr-muted-fg">
              {insight.confidence}% confianza
            </span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
            {insight.title}
          </h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase">{insight.priority}</span>
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-3 leading-relaxed">
        {insight.action}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-cr-muted mt-2 leading-relaxed">
        {insight.rationale}
      </p>
      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">
        Evidencia: {insight.evidence}
      </p>
    </div>
  );
}

function VideoInsightRow({ insight }: { insight: VideoAnalysisInsight }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-cr-border-dark bg-slate-50 dark:bg-cr-elevated-dark/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-850 dark:text-white truncate" title={insight.title}>
            {insight.title}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {formatNumber(insight.comments)} analizados · {insight.coveragePercent}% cobertura · señal: {insight.topSignal}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{insight.actionablePercent}%</p>
          <p className="text-[10px] text-slate-400">accionable</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-extrabold text-emerald-600">{insight.positivePercent}%</p>
          <p className="text-[10px] text-slate-400">Apoyo</p>
        </div>
        <div>
          <p className="text-xs font-extrabold text-sky-600">{insight.actionableCount}</p>
          <p className="text-[10px] text-slate-400">Señales</p>
        </div>
        <div>
          <p className="text-xs font-extrabold text-red-600">{insight.negativePercent}%</p>
          <p className="text-[10px] text-slate-400">Crítica</p>
        </div>
      </div>
    </div>
  );
}

export const CommentsAnalysis: React.FC = () => {
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
      loadChannelVideos().then(() => loadCommentAnalysis());
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
  const decisionInsights = commentAnalysis?.decisionInsights ?? [];
  const videoInsights = commentAnalysis?.videoInsights ?? [];
  const faqs = commentAnalysis?.faqs ?? [];
  const alerts = commentAnalysis?.alerts ?? [];
  const strategicReport = commentAnalysis?.strategicReport;
  const commentsByCategory = commentAnalysis?.commentsByCategory;
  const questions = commentsByCategory?.pregunta ?? [];
  const problems = commentsByCategory?.problema ?? [];
  const suggestions = commentsByCategory?.sugerencia ?? [];
  const praise = commentsByCategory?.elogio ?? [];
  const opportunityCount = suggestions.length + questions.length + topics.length;
  const frictionCount = problems.length + alerts.filter((alert) => alert.type === 'problema').length;
  const signal = getSignalLabel(sentiment, alerts, strategicReport);
  const maxTopicCount = Math.max(...topics.map((topic) => topic.count), 1);
  const engineLabel = formatEngine(commentAnalysis?.analysisEngine);
  const summaryText = strategicReport?.summary || commentAnalysis?.analysisReport || signal.detail;
  const nextActionText =
    decisionInsights[0]?.action ||
    strategicReport?.next_steps ||
    (topics[0]
      ? `Convierte "${topics[0].name}" en una pieza de contenido y responde las preguntas más repetidas en la intro.`
      : 'Analiza más comentarios para detectar una oportunidad clara de contenido.');
  const scopeText =
    commentViewFilter === 'all'
      ? `${commentAnalysis?.trackedVideos.length ?? 0} video(s) en este tablero`
      : channelVideos.find((video) => video.id === commentViewFilter)?.title ?? 'Video filtrado';

  const categoryItems = [
    { text: 'Preguntas', count: questions.length, color: '#0ea5e9' },
    { text: 'Sugerencias', count: suggestions.length, color: '#10b981' },
    { text: 'Problemas', count: problems.length, color: '#ef4444' },
    { text: 'Elogios', count: praise.length, color: '#f59e0b' },
  ];
  const totalCategorySignals = categoryItems.reduce((sum, item) => sum + item.count, 0);
  const categorySegments = categoryItems
    .map((item) => ({
      percentage:
        totalCategorySignals > 0
          ? Math.max(1, Math.round((item.count / totalCategorySignals) * 100))
          : 0,
      color: item.color,
    }))
    .filter((segment) => segment.percentage > 0);

  return (
    <div className="cr-page">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-cr-elevated-dark px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-cr-muted">
              <MessageSquare size={13} />
              Comentarios de YouTube
            </span>
            {engineLabel && (
              <span className="inline-flex items-center rounded-lg bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-cr-accent dark:text-indigo-400">
                {engineLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard de audiencia
          </h1>
          <p className="text-slate-500 dark:text-cr-muted text-sm mt-1 max-w-2xl">
            {activeChannel
              ? selectedYoutubeVideoIds.length > 0
                ? `${selectedYoutubeVideoIds.length} video(s) seleccionado(s) · catálogo de ${channelVideos.length} videos`
                : `Lee patrones, oportunidades y fricciones en los últimos ${LATEST_VIDEOS_LIMIT} videos de ${activeChannel.name}`
              : 'Vincula un canal para analizar comentarios'}
          </p>
          {commentAnalysis?.lastAnalyzedAt && (
            <p className="text-[11px] text-slate-400 mt-1">
              Último análisis: {new Date(commentAnalysis.lastAnalyzedAt).toLocaleString('es-ES')}
            </p>
          )}
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2 xl:flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => analyzeComments('latest')}
              disabled={!activeChannel || isAnalyzingComments || !youtubeApiConfigured}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cr-accent hover:bg-cr-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors shadow-md shadow-indigo-500/20"
            >
              {isAnalyzingComments ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isAnalyzingComments ? 'Analizando...' : `Últimos ${LATEST_VIDEOS_LIMIT}`}
            </button>
            <button
              onClick={() => analyzeComments('selected')}
              disabled={
                !activeChannel ||
                isAnalyzingComments ||
                !youtubeApiConfigured ||
                selectedYoutubeVideoIds.length === 0
              }
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-cr-elevated-dark border border-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-50 disabled:cursor-not-allowed text-violet-700 dark:text-violet-300 text-sm font-bold transition-colors"
            >
              <Video size={16} />
              Seleccionados ({selectedYoutubeVideoIds.length})
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-left sm:text-right max-w-sm">
            <span className="font-semibold text-cr-accent dark:text-indigo-400">Seleccionados:</span>{' '}
            todos los comentarios del video hasta {formatNumber(MAX_COMMENTS_SELECTED_CAP)}.{' '}
            <span className="font-semibold">Últimos {LATEST_VIDEOS_LIMIT}:</span> máx.{' '}
            {MAX_COMMENTS_BULK_PER_VIDEO} por video.
          </p>
        </div>
      </div>

      {activeChannel && (
        <div className="p-4 cr-card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Videos en alcance</h2>
              <p className="text-[11px] text-slate-500 dark:text-cr-muted">
                Selecciona videos para hacer un análisis completo de comentarios.
              </p>
            </div>
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
              Cargando videos del canal...
            </div>
          ) : channelVideos.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              No hay videos disponibles. Pulsa analizar para sincronizar el catálogo.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1">
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
                        {formatNumber(video.viewCount)} vistas · {formatNumber(video.commentCount)} comentarios
                      </p>
                      <VideoEngagementBadge likes={video.likeCount} dislikes={video.dislikeCount} compact />
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <VideoStatusBadge video={video} />
                      {video.analysisStatus === 'done' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setCommentViewFilter(video.id);
                          }}
                          className="text-[10px] font-bold text-cr-accent dark:text-indigo-400 hover:underline"
                        >
                          Ver análisis
                        </button>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isAnalyzingComments && (
        <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{analyzeCommentsStep}</p>
            <span className="text-xs font-bold text-cr-accent dark:text-indigo-400">{analyzeCommentsProgress}%</span>
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
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
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
          <p className="text-slate-600 dark:text-cr-muted mb-4 max-w-xl mx-auto">
            Selecciona uno o más videos y pulsa &quot;Seleccionados&quot;, o usa &quot;Últimos {LATEST_VIDEOS_LIMIT}&quot;
            para obtener un dashboard ejecutivo de la conversación.
          </p>
        </div>
      )}

      {(hasData || isAnalyzingComments) && activeChannel && commentAnalysis && (
        <>
          {commentAnalysis.trackedVideos.some((v) => v.analysisStatus === 'done') && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-500 dark:text-cr-muted whitespace-nowrap">
                Alcance del dashboard
              </label>
              <select
                value={commentViewFilter}
                onChange={(e) => setCommentViewFilter(e.target.value as 'all' | string)}
                className="flex-1 max-w-xl text-sm rounded-lg border border-slate-200 dark:border-cr-border-dark bg-white dark:bg-cr-elevated-dark text-slate-800 dark:text-slate-100 px-3 py-2"
              >
                <option value="all">Todos los videos analizados</option>
                {channelVideos
                  .filter((v) => v.analysisStatus === 'done')
                  .map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.title.slice(0, 70)}
                      {video.title.length > 70 ? '...' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-8 cr-card p-5">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-extrabold ${signal.tone}`}>
                      {signal.label}
                    </p>
                    <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 dark:text-cr-muted bg-slate-100 dark:bg-cr-elevated-dark max-w-full truncate">
                      {scopeText}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">
                    Lectura rápida de la audiencia
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-cr-muted mt-2 leading-relaxed max-w-3xl">
                    {summaryText}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center lg:text-left">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{sentiment.positive}%</p>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Apoyo</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 dark:bg-sky-950/20 p-3 text-center lg:text-left">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{opportunityCount}</p>
                    <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">Oportunidades</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-center lg:text-left">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{frictionCount}</p>
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Fricciones</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-50 dark:bg-cr-elevated-dark px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Cobertura</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {stats.coveragePercent}% de comentarios
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-cr-elevated-dark px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Tema líder</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {topics[0]?.name ?? 'Sin tema dominante'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-cr-elevated-dark px-3 py-2">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Riesgo</p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {alerts.filter((alert) => alert.priority === 'alta').length} alertas altas
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 cr-card p-5">
              <SectionHeader
                title="Próxima acción"
                eyebrow={strategicReport?.next_steps ? 'Recomendación estratégica' : 'Decisión sugerida'}
                icon={Compass}
              />
              <p className="text-sm text-slate-700 dark:text-cr-muted leading-relaxed max-h-40 overflow-y-auto pr-1">
                {compactText(nextActionText, 560)}
              </p>
              <div className="mt-4 rounded-lg bg-slate-50 dark:bg-cr-elevated-dark p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">Prioridad del tablero</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {alerts.some((alert) => alert.priority === 'alta')
                    ? 'Responder críticas antes de publicar'
                    : decisionInsights[0]
                      ? decisionInsights[0].title
                      : topics[0]
                      ? `Producir sobre ${topics[0].name}`
                      : 'Recolectar más comentarios'}
                </p>
              </div>
            </div>
          </div>

          {(decisionInsights.length > 0 || videoInsights.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8 cr-card cr-card-pad">
                <SectionHeader
                  title="Decisiones recomendadas"
                  eyebrow="Prioridad, acción y evidencia para planificar futuros videos"
                  icon={ListChecks}
                />
                {decisionInsights.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {decisionInsights.slice(0, 4).map((insight) => (
                      <DecisionInsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-cr-muted">
                    Aún no hay señales suficientes para recomendar una decisión concreta.
                  </p>
                )}
              </div>

              <div className="xl:col-span-4 cr-card cr-card-pad">
                <SectionHeader
                  title="Videos con más señales"
                  eyebrow="Dónde hay más preguntas, sugerencias o fricciones"
                  icon={Video}
                />
                {videoInsights.length > 0 ? (
                  <div className="space-y-3">
                    {videoInsights.slice(0, 3).map((insight) => (
                      <VideoInsightRow key={insight.videoId} insight={insight} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-cr-muted">
                    Sin señales por video todavía.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricTile
              label="Comentarios analizados"
              value={formatNumber(stats.totalComments)}
              detail={
                stats.totalAvailable > stats.totalComments
                  ? `${stats.coveragePercent}% de ${formatNumber(stats.totalAvailable)} disponibles`
                  : 'Muestra usada para detectar patrones'
              }
              icon={MessageSquare}
              tone="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
            />
            <MetricTile
              label="Usuarios únicos"
              value={formatNumber(stats.uniqueUsers)}
              detail="Personas distintas participando en la conversación"
              icon={Users}
              tone="text-sky-600 dark:text-sky-400 bg-sky-500/10"
            />
            <MetricTile
              label="Densidad diaria"
              value={formatNumber(stats.commentsPerDay)}
              detail="Comentarios promedio por día analizado"
              icon={BarChart3}
              tone="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            />
            <MetricTile
              label="Interacción accionable"
              value={`${stats.averageEngagement}%`}
              detail="Preguntas, problemas y sugerencias sobre el total"
              icon={Gauge}
              tone="text-amber-600 dark:text-amber-400 bg-amber-500/10"
            />
          </div>

          {stats.totalAvailable > stats.totalComments && stats.totalComments > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              Solo se analizaron {formatNumber(stats.totalComments)} de {formatNumber(stats.totalAvailable)} comentarios.
              Selecciona el video y pulsa <strong>Seleccionados</strong> para un análisis completo.
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 cr-card cr-card-pad">
              <SectionHeader
                title="Mapa de oportunidades"
                eyebrow="Temas que pueden transformarse en videos, series, respuestas o guiones"
                icon={Target}
              />
              {topics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topics.map((topic, index) => (
                    <TopicRow key={topic.name} topic={topic} index={index} maxCount={maxTopicCount} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-cr-muted">
                  Sin temas accionables aún. Analiza más videos o espera sugerencias/preguntas de la audiencia.
                </p>
              )}
            </div>

            <div className="xl:col-span-5 cr-card cr-card-pad">
              <SectionHeader
                title="Salud de la conversación"
                eyebrow={
                  resonance.count > 0
                    ? `${resonance.count} eco(s) del título detectados (${resonance.percentage}%)`
                    : 'Distribución de señales accionables detectadas'
                }
                icon={ThumbsUp}
              />
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {categorySegments.length > 0 ? (
                  <DesignDonutChart
                    sizeClass="w-40 h-40"
                    segments={categorySegments}
                    centerLabel={formatNumber(totalCategorySignals)}
                    centerSub="señales"
                  />
                ) : (
                  <p className="text-sm text-slate-500">Sin señales accionables.</p>
                )}
                <div className="flex-1 w-full space-y-4">
                  <RankedProgressList items={categoryItems} maxCount={Math.max(...categoryItems.map((i) => i.count), 1)} />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-extrabold text-emerald-600">{sentiment.positive}%</p>
                      <p className="text-[10px] text-slate-400">Positivo</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-amber-600">{sentiment.neutral}%</p>
                      <p className="text-[10px] text-slate-400">Neutral</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-red-600">{sentiment.negative}%</p>
                      <p className="text-[10px] text-slate-400">Crítica</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 cr-card cr-card-pad">
              <SectionHeader
                title="Preguntas y solicitudes"
                eyebrow="Lo que puedes responder en próximos contenidos o comentarios fijados"
                icon={HelpCircle}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-3">Preguntas frecuentes</h3>
                  {faqs.length > 0 ? (
                    <div className="space-y-2">
                      {faqs.slice(0, 6).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 dark:bg-cr-elevated-dark/60 p-3"
                        >
                          <p className="text-xs font-semibold text-slate-700 dark:text-cr-muted leading-relaxed">
                            {item.text}
                          </p>
                          <span className="font-extrabold text-slate-850 dark:text-white bg-white dark:bg-cr-card-dark border border-slate-200/50 dark:border-cr-border-dark px-2 py-0.5 rounded text-xs">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-cr-muted">No se detectaron preguntas frecuentes.</p>
                  )}
                </div>
                <CommentPreview
                  title="Sugerencias destacadas"
                  comments={suggestions}
                  emptyMessage="No hay sugerencias en el análisis actual."
                  icon={Lightbulb}
                />
              </div>
            </div>

            <div className="xl:col-span-5 cr-card cr-card-pad">
              <SectionHeader
                title="Riesgos y alertas"
                eyebrow="Problemas repetidos, sentimiento sensible o señales que requieren respuesta"
                icon={ShieldAlert}
              />
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <CommentPreview
                  title="Problemas detectados"
                  comments={problems}
                  emptyMessage="No hay problemas relevantes en este análisis."
                  icon={AlertTriangle}
                />
              )}
            </div>
          </div>

          {(strategicReport?.content_opportunities?.length ||
            strategicReport?.strategic_recommendations?.length ||
            strategicReport?.actionable_alerts?.length) && (
            <div className="cr-card cr-card-pad">
              <SectionHeader
                title="Plan estratégico generado por IA"
                eyebrow="Oportunidades, acciones y recomendaciones consolidadas"
                icon={Sparkles}
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-cr-border-dark p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone size={16} className="text-sky-500" />
                    <h3 className="text-sm font-bold text-slate-850 dark:text-white">Oportunidades</h3>
                  </div>
                  <div className="space-y-3">
                    {(strategicReport?.content_opportunities ?? []).slice(0, 4).map((item) => (
                      <div key={`${item.topic}-${item.priority}`}>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{item.topic}</p>
                        <p className="text-[11px] text-slate-500 dark:text-cr-muted leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    ))}
                    {!strategicReport?.content_opportunities?.length && (
                      <p className="text-sm text-slate-500 dark:text-cr-muted">Sin oportunidades estratégicas adicionales.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-cr-border-dark p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks size={16} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-850 dark:text-white">Recomendaciones</h3>
                  </div>
                  <div className="space-y-2">
                    {(strategicReport?.strategic_recommendations ?? []).slice(0, 5).map((item, index) => (
                      <p key={index} className="text-xs text-slate-600 dark:text-cr-muted leading-relaxed">
                        {index + 1}. {item}
                      </p>
                    ))}
                    {!strategicReport?.strategic_recommendations?.length && (
                      <p className="text-sm text-slate-500 dark:text-cr-muted">Sin recomendaciones adicionales.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-cr-border-dark p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-850 dark:text-white">Notas ejecutivas</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-cr-muted leading-relaxed">
                    {strategicReport?.engagement_metrics?.consumption_pattern ||
                      strategicReport?.engagement_metrics?.community_loyalty ||
                      commentAnalysis.analysisReport ||
                      'El análisis no incluyó notas ejecutivas adicionales.'}
                  </p>
                  {strategicReport?.engagement_metrics?.viral_potential && (
                    <p className="text-xs text-slate-600 dark:text-cr-muted leading-relaxed mt-3">
                      <span className="font-bold text-slate-800 dark:text-white">Potencial viral:</span>{' '}
                      {strategicReport.engagement_metrics.viral_potential}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {resonantHooks.length > 0 && (
            <div className="cr-card cr-card-pad">
              <SectionHeader
                title="Hooks que resonaron"
                eyebrow="Frases o ideas del video que la audiencia repitió como señal de engagement"
                icon={Sparkles}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {resonantHooks.map((hook) => (
                  <div
                    key={`${hook.videoId}-${hook.hook}`}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-cr-elevated-dark/60 border border-slate-100 dark:border-cr-border-dark/60"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-850 dark:text-white truncate">{hook.hook}</span>
                      <span className="text-xs font-extrabold text-cr-accent dark:text-indigo-400 flex-shrink-0">
                        {hook.count}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate" title={hook.videoTitle}>
                      {hook.videoTitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
