import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  FileText,
  Filter,
  Gauge,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Users,
  Video,
  X,
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
import { VideoEngagementBadge } from '../components/VideoEngagementBadge';
import { DesignDonutChart } from '../components/charts/DesignDonutChart';
import { RankedProgressList } from '../components/charts/RankedProgressList';
import { MetricCard } from '../components/ui/MetricCard';
import { VideoThumbnail } from '../components/VideoThumbnail';

const TOPIC_COLORS = ['#3B82F6', '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4'];

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('es-ES');
}

function formatEngine(engine?: string): string {
  if (!engine) return 'Deep Seek';
  if (engine === 'pysentimiento') return 'IA (pysentimiento)';
  if (engine === 'deepseek-chat') return 'Deep Seek';
  if (engine === 'gemini') return 'Gemini';
  return engine;
}

function getEngineLogoUrl(engineLabel: string): string | null {
  const lower = engineLabel.toLowerCase();
  if (lower.includes('deep seek') || lower.includes('deepseek')) {
    return 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64';
  }
  if (lower.includes('gemini')) {
    return 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64';
  }
  return null;
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
      tone: 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20',
      detail: 'Hay críticas u objeciones que conviene atender antes de publicar más contenido similar.',
    };
  }

  if (sentiment.positive >= 55) {
    return {
      label: 'Comunidad muy receptiva',
      tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
      detail: 'La conversación está fuertemente inclinada al apoyo; excelente momento para convertir preguntas en contenido.',
    };
  }

  return {
    label: 'Señales mixtas',
    tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
    detail: 'Hay interés sostenido, pero conviene segmentar con cuidado curiosidad, dudas y objeciones.',
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
    alta: 'border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-300',
    media: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    baja: 'border-sky-200/80 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300',
  };
  const Icon = icons[alert.type];

  return (
    <div className={`p-5 rounded-2xl border transition-all ${colors[alert.priority]}`}>
      <div className="flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-white/80 dark:bg-black/30 flex items-center justify-center flex-shrink-0 shadow-xs">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{alert.title}</p>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30">
              {alert.priority}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function VideoStatusBadge({ video }: { video: TrackedVideo }) {
  if (video.analysisStatus === 'done' && video.commentsAnalyzedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
        <CheckCircle2 size={11} />
        Analizado
      </span>
    );
  }
  if (video.analysisStatus === 'analyzing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
        <Loader2 size={11} className="animate-spin" />
        Analizando
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50">
      <Clock size={11} />
      Pendiente
    </span>
  );
}

function SectionHeader({
  title,
  eyebrow,
  icon: Icon,
  badge,
}: {
  title: string;
  eyebrow?: string;
  icon: React.ElementType;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{title}</h2>
          {eyebrow && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{eyebrow}</p>}
        </div>
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {badge}
        </span>
      )}
    </div>
  );
}

function TopicRow({ topic, index, maxCount }: { topic: TopicMention; index: number; maxCount: number }) {
  const width = Math.max(8, (topic.count / Math.max(maxCount, 1)) * 100);
  const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
  const sourceLabels: Record<NonNullable<TopicMention['source']>, string> = {
    sugerencia: 'Pedido de contenido',
    pregunta: 'Duda frecuente',
    problema: 'Fricción / Objeción',
    tema_video: 'Tema del video',
    nicho: 'Interés de nicho',
    resonancia: 'Hook / Frase clave',
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#121624] p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{topic.name}</p>
          </div>
          {topic.insight && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{topic.insight}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{topic.count}</p>
          <p className="text-[10px] font-semibold text-slate-400">{topic.percentage}% menciones</p>
        </div>
      </div>
      <div className="mt-3.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      {topic.source && (
        <span className="inline-flex mt-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
          {sourceLabels[topic.source]}
        </span>
      )}
    </div>
  );
}

type DisplayComment = Pick<Comment, 'id' | 'authorName' | 'text' | 'publishedAt'> & {
  isReply?: boolean;
  topic?: string;
  sentiment?: string;
  category?: string;
};

function CommentPreview({
  title,
  comments,
  emptyMessage,
  icon: Icon,
}: {
  title: string;
  comments: DisplayComment[];
  emptyMessage: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#121624] p-5 flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Icon size={14} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </div>

        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {comments.slice(0, 4).map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {comment.isReply && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                      💬 Respuesta
                    </span>
                  )}
                  {comment.topic && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                      {comment.topic}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-3">
                  "{comment.text}"
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/40 text-[10px] text-slate-400">
                  <span className="font-semibold">{comment.authorName}</span>
                  <span>{new Date(comment.publishedAt).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionInsightCard({ insight }: { insight: DecisionInsight }) {
  const priorityStyles = {
    alta: {
      badge: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40',
      accent: 'bg-red-500',
      border: 'border-red-200/80 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800',
    },
    media: {
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40',
      accent: 'bg-amber-500',
      border: 'border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800',
    },
    baja: {
      badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40',
      accent: 'bg-blue-500',
      border: 'border-blue-200/80 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-800',
    },
  }[insight.priority];

  const typeBadge = {
    crear: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
    responder: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400',
    corregir: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400',
    duplicar: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
  };
  const typeLabel = {
    crear: 'Nuevo video',
    responder: 'Responder / Fijar',
    corregir: 'Ajuste urgente',
    duplicar: 'Potenciar tema',
  };

  const showEvidence =
    insight.evidence &&
    insight.evidence.toLowerCase().trim() !== insight.rationale.toLowerCase().trim() &&
    insight.evidence.length > 10;

  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-[#121624] p-5 sm:p-6 shadow-sm transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${priorityStyles.border}`}
    >
      {/* Decorative vertical left accent indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityStyles.accent}`} />

      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${typeBadge[insight.type]}`}
            >
              {typeLabel[insight.type]}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {insight.confidence}% confianza
            </span>
            {insight.id.startsWith('strat_') && (
              <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/40">
                IA estratégica
              </span>
            )}
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${priorityStyles.badge}`}
          >
            Prioridad {insight.priority}
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-3 leading-snug">
          {insight.title}
        </h3>

        <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800/80">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
            👉 <span className="font-bold text-blue-600 dark:text-blue-400">Acción:</span> {insight.action}
          </p>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
          {insight.rationale}
        </p>
      </div>

      {showEvidence && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <p className="text-[11px] text-slate-400 italic">
            <span className="font-semibold text-slate-500 dark:text-slate-400 not-italic mr-1">
              Evidencia:
            </span>
            {insight.evidence}
          </p>
        </div>
      )}
    </div>
  );
}

function VideoInsightRow({ insight }: { insight: VideoAnalysisInsight }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#121624] p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={insight.title}>
            {insight.title}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {formatNumber(insight.comments)} comentarios · {insight.coveragePercent}% cobertura · señal: {insight.topSignal}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{insight.actionablePercent}%</p>
          <p className="text-[10px] text-slate-400 font-semibold">accionable</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5 text-center border-t border-slate-100 dark:border-slate-800/60 pt-3.5">
        <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 border border-emerald-100/60 dark:border-emerald-900/30">
          <p className="text-sm font-extrabold text-emerald-600">{insight.positivePercent}%</p>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Apoyo</p>
        </div>
        <div className="rounded-xl bg-sky-50/60 dark:bg-sky-950/20 p-2.5 border border-sky-100/60 dark:border-sky-900/30">
          <p className="text-sm font-extrabold text-sky-600">{insight.actionableCount}</p>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Señales</p>
        </div>
        <div className="rounded-xl bg-red-50/60 dark:bg-red-950/20 p-2.5 border border-red-100/60 dark:border-red-900/30">
          <p className="text-sm font-extrabold text-red-600">{insight.negativePercent}%</p>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Crítica</p>
        </div>
      </div>
    </div>
  );
}

// Sample preview data to show when user has not yet analyzed comments
const DEMO_PREVIEW_DATA = {
  stats: {
    totalComments: 1420,
    totalAvailable: 1850,
    coveragePercent: 77,
    uniqueUsers: 1140,
    commentsPerDay: 48,
    averageEngagement: 38,
  },
  sentiment: {
    positive: 74,
    neutral: 18,
    negative: 8,
  },
  topics: [
    { name: 'Automatizaciones con IA y Plugins', count: 342, percentage: 24, source: 'sugerencia' as const, insight: 'La audiencia solicita un tutorial práctico paso a paso de setup.' },
    { name: 'Micrófonos y Calidad de Audio', count: 215, percentage: 15, source: 'pregunta' as const, insight: 'Preguntas recurrentes sobre configuración OBS y reducción de ruido.' },
    { name: 'Estrategia de Nicho en YouTube', count: 184, percentage: 13, source: 'resonancia' as const, insight: 'El concepto de "micro-audiencias" fue el más citado y compartido.' },
    { name: 'Monetización y Patrocinios', count: 140, percentage: 10, source: 'sugerencia' as const, insight: 'Interés por cómo negociar tarifas de patrocinio iniciales.' },
  ],
  questions: [
    { text: '¿Qué configuración de OBS usas para que no baje los FPS en streaming?', count: 42 },
    { text: '¿Recomiendas empezar con Shorts o con videos largos en 2026?', count: 38 },
    { text: '¿Cómo automatizas la edición de subtítulos con IA?', count: 29 },
  ],
  suggestions: [
    {
      id: 'demo-sug-1',
      authorName: 'Carlos M.',
      text: '¡Por favor haz una segunda parte profundizando en los prompts que usas para armar los guiones! Sería oro puro.',
      publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-sug-2',
      authorName: 'Lucía Tech',
      text: 'Me encantaría ver una comparativa real entre DeepSeek y Gemini para estructurar canales pequeños.',
      publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
  problems: [
    {
      id: 'demo-prob-1',
      authorName: 'Alex Rivera',
      text: 'El enlace del recurso que mencionas en el minuto 04:15 está caído o pide permisos en Google Drive.',
      publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  decisionInsights: [
    {
      id: 'strat_1',
      type: 'crear' as const,
      priority: 'alta' as const,
      confidence: 94,
      title: 'Crear tutorial profundo de automatizaciones de edición con IA',
      action: 'Publicar video de 12-15 min con workflow completo y plantillas descargables.',
      rationale: 'Es el tema con mayor densidad de preguntas (342 menciones) y nula objeción.',
      evidence: '38 comentarios pidiendo explícitamente "segunda parte con prompts"',
    },
    {
      id: 'strat_2',
      type: 'corregir' as const,
      priority: 'alta' as const,
      confidence: 98,
      title: 'Actualizar enlace de recursos en el video fijado',
      action: 'Editar el link fijado en la descripción y comentario destacado para evitar fricción.',
      rationale: 'Varios usuarios no pudieron descargar la plantilla prometida.',
      evidence: '14 comentarios de quejas sobre el enlace que requiere permiso',
    },
  ],
  alerts: [
    {
      id: 'alt_1',
      type: 'problema' as const,
      priority: 'alta' as const,
      title: 'Enlace roto en descripción (Min 04:15)',
      description: 'Varios comentarios reportan que el enlace para descargar las plantillas pide permisos de acceso.',
    },
    {
      id: 'alt_2',
      type: 'sugerencia' as const,
      priority: 'media' as const,
      title: 'Alta demanda de segunda parte sobre prompts',
      description: 'Más del 20% de las sugerencias solicitan el template exacto de estructuración de guión.',
    },
  ],
};

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
    cancelAnalysis,
    clearVideoAnalysis,
  } = useAppStore();

  const [videoFilter, setVideoFilter] = useState<'todos' | 'analizados' | 'pendientes'>('todos');
  const [searchVideo, setSearchVideo] = useState('');

  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  useEffect(() => {
    if (activeChannel) {
      loadChannelVideos().then(() => loadCommentAnalysis());
    }
  }, [activeChannel?.id, loadChannelVideos, loadCommentAnalysis]);

  const hasData = Boolean(commentAnalysis && commentAnalysis.stats.totalComments > 0);

  // If no data is available yet, we use preview data for the dashboard demonstration
  const displayData = hasData ? commentAnalysis! : null;
  const isDemoPreview = !hasData && !isAnalyzingComments;

  const stats = displayData?.stats ?? (isDemoPreview ? DEMO_PREVIEW_DATA.stats : {
    totalComments: 0,
    totalAvailable: 0,
    coveragePercent: 0,
    uniqueUsers: 0,
    commentsPerDay: 0,
    averageEngagement: 0,
  });

  const strategicSentiment = displayData?.strategicReport?.sentiment_analysis;
  const sentiment = strategicSentiment
    ? {
        positive: strategicSentiment.positive_percent,
        neutral: strategicSentiment.neutral_percent,
        negative: strategicSentiment.negative_percent,
      }
    : (displayData?.sentiment ?? (isDemoPreview ? DEMO_PREVIEW_DATA.sentiment : { positive: 0, neutral: 0, negative: 0 }));

  const resonance = displayData?.resonance ?? { count: 4, percentage: 12 };
  const resonantHooks = displayData?.resonantHooks ?? [];
  const topics = displayData?.topics?.length ? displayData.topics : (isDemoPreview ? DEMO_PREVIEW_DATA.topics : []);
  const decisionInsights = displayData?.decisionInsights?.length ? displayData.decisionInsights : (isDemoPreview ? DEMO_PREVIEW_DATA.decisionInsights : []);
  const videoInsights = displayData?.videoInsights ?? [];
  const faqs = displayData?.faqs?.length ? displayData.faqs : (isDemoPreview ? DEMO_PREVIEW_DATA.questions : []);
  const alerts = displayData?.alerts?.length ? displayData.alerts : (isDemoPreview ? DEMO_PREVIEW_DATA.alerts : []);
  const strategicReport = displayData?.strategicReport;
  const commentsByCategory = displayData?.commentsByCategory;
  const questions = commentsByCategory?.pregunta?.length ? commentsByCategory.pregunta : (isDemoPreview ? DEMO_PREVIEW_DATA.questions.map((q, i) => ({ id: `q-${i}`, text: q.text, authorName: 'Usuario', publishedAt: new Date().toISOString() })) : []);
  const problems = commentsByCategory?.problema?.length ? commentsByCategory.problema : (isDemoPreview ? DEMO_PREVIEW_DATA.problems : []);
  const suggestions = commentsByCategory?.sugerencia?.length ? commentsByCategory.sugerencia : (isDemoPreview ? DEMO_PREVIEW_DATA.suggestions : []);
  const praise = commentsByCategory?.elogio ?? [];

  const opportunityCount = suggestions.length + questions.length;
  const frictionCount = problems.length;
  const signal = getSignalLabel(sentiment, alerts, strategicReport);
  const maxTopicCount = Math.max(...topics.map((topic) => topic.count), 1);
  const engineLabel = formatEngine(displayData?.analysisEngine);

  const summaryText =
    strategicReport?.summary ||
    displayData?.analysisReport ||
    (isDemoPreview
      ? 'La comunidad muestra un entusiasmo elevado (+74% apoyo) con un pico de interés en flujos de trabajo de automatización con IA. Se identificaron 2 dudas críticas sobre setup de audio y un enlace roto que genera fricciones menores en la descripción.'
      : signal.detail);

  const nextActionText =
    strategicReport?.next_steps ||
    decisionInsights[0]?.action ||
    (topics[0]
      ? `Convierte "${topics[0].name}" en tu próxima pieza central de contenido y responde las dudas técnicas en los primeros 60 segundos.`
      : 'Analiza más comentarios para detectar una oportunidad clara de contenido.');

  const scopeText =
    commentViewFilter === 'all'
      ? `${commentAnalysis?.trackedVideos.length ?? 0} video(s) en este tablero`
      : channelVideos.find((video) => video.id === commentViewFilter)?.title ?? 'Video filtrado';

  const categoryItems = [
    { text: 'Preguntas', count: questions.length, color: '#3B82F6' },
    { text: 'Sugerencias', count: suggestions.length, color: '#10B981' },
    { text: 'Problemas', count: problems.length, color: '#EF4444' },
    { text: 'Elogios', count: praise.length > 0 ? praise.length : 18, color: '#F59E0B' },
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

  // Filtered videos for the selector
  const filteredVideos = channelVideos
    .filter((v) => {
      if (videoFilter === 'analizados') return v.analysisStatus === 'done';
      if (videoFilter === 'pendientes') return v.analysisStatus !== 'done';
      return true;
    })
    .filter((v) => {
      if (!searchVideo.trim()) return true;
      return v.title.toLowerCase().includes(searchVideo.toLowerCase());
    });

  const selectedCount = selectedYoutubeVideoIds.length;

  return (
    <div className="cr-page space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              <MessageSquare size={13} />
              Audience Intelligence & NLP
            </span>
            {engineLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {getEngineLogoUrl(engineLabel) && (
                  <img
                    src={getEngineLogoUrl(engineLabel)!}
                    alt={engineLabel}
                    className="w-3.5 h-3.5 rounded-sm object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                Motor {engineLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Análisis de Comentarios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            {activeChannel
              ? selectedCount > 0
                ? `${selectedCount} video(s) seleccionado(s) de ${activeChannel.name} · Catálogo de ${channelVideos.length} videos`
                : `Selecciona un video de ${activeChannel.name} para extraer patrones, preguntas y señales de audiencia`
              : 'Vincula un canal en Ajustes para comenzar el análisis'}
          </p>
          {commentAnalysis?.lastAnalyzedAt && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Calendar size={12} />
              Último análisis: {new Date(commentAnalysis.lastAnalyzedAt).toLocaleString('es-ES')}
            </p>
          )}
        </div>

        {/* Global Action Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:flex-shrink-0">
          {!isAnalyzingComments ? (
            <button
              onClick={() => analyzeComments()}
              disabled={!activeChannel || !youtubeApiConfigured || selectedCount === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Video size={16} />
              <span>
                {selectedCount > 0
                  ? `Analizar ${selectedCount} video${selectedCount > 1 ? 's' : ''}`
                  : 'Selecciona un video para analizar'}
              </span>
            </button>
          ) : (
            <button
              onClick={cancelAnalysis}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold transition-all shadow-xs"
            >
              <X size={16} />
              <span>Cancelar análisis</span>
            </button>
          )}
        </div>
      </div>

      {/* Analysis In-Progress Banner */}
      {isAnalyzingComments && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <Loader2 size={18} className="animate-spin text-blue-200" />
              <p className="text-sm font-bold">{analyzeCommentsStep}</p>
            </div>
            <span className="text-sm font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full">
              {analyzeCommentsProgress}%
            </span>
          </div>
          <div className="h-2.5 bg-black/20 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${analyzeCommentsProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Analysis Error Alert */}
      {analyzeCommentsError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Ocurrió un error en el análisis</p>
            <p className="text-xs mt-0.5 opacity-90">{analyzeCommentsError}</p>
          </div>
        </div>
      )}

      {/* Video Selector Card ("Videos en alcance") */}
      {activeChannel && (
        <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/70">
            <div>
              <div className="flex items-center gap-2">
                <Video size={16} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Videos en alcance para análisis
                </h2>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {channelVideos.length} disponibles
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Haz clic en cualquier video para seleccionarlo y extraer los patrones de su audiencia.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setVideoFilter('todos')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    videoFilter === 'todos'
                      ? 'bg-white dark:bg-[#121624] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({channelVideos.length})
                </button>
                <button
                  onClick={() => setVideoFilter('analizados')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    videoFilter === 'analizados'
                      ? 'bg-white dark:bg-[#121624] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Analizados ({channelVideos.filter((v) => v.analysisStatus === 'done').length})
                </button>
                <button
                  onClick={() => setVideoFilter('pendientes')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    videoFilter === 'pendientes'
                      ? 'bg-white dark:bg-[#121624] text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Pendientes ({channelVideos.filter((v) => v.analysisStatus !== 'done').length})
                </button>
              </div>

              {selectedCount > 0 && (
                <button
                  onClick={clearVideoSelection}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors px-2 py-1"
                >
                  Deseleccionar ({selectedCount})
                </button>
              )}
            </div>
          </div>

          {/* Videos Grid */}
          {isLoadingChannelVideos ? (
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500 py-10">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <p className="font-semibold">Cargando catálogo de videos del canal...</p>
            </div>
          ) : channelVideos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">
                No hay videos sincronizados. Pulsa sincronizar en el header para actualizar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredVideos.map((video) => {
                const isSelected = selectedYoutubeVideoIds.includes(video.youtubeVideoId);
                const isDone = video.analysisStatus === 'done';

                return (
                  <div
                    key={video.id}
                    onClick={() => toggleVideoSelection(video.youtubeVideoId)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#121624] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <VideoThumbnail
                        src={video.thumbnailUrl}
                        title={video.title}
                        className="w-20 h-13"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <VideoStatusBadge video={video} />
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <p
                          className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight"
                          title={video.title}
                        >
                          {video.title}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye size={11} />
                          {formatNumber(video.viewCount)}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                          <MessageSquare size={11} />
                          {formatNumber(video.commentCount)}
                        </span>
                      </div>

                      {isDone && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearVideoAnalysis(video.youtubeVideoId);
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-0.5"
                            title="Resetear análisis"
                          >
                            <Trash2 size={10} />
                            Resetear
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCommentViewFilter(video.id);
                            }}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Ver reporte →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Demo Preview Banner if no real data is loaded yet */}
      {isDemoPreview && activeChannel && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Previsualización Interactiva
                </span>
                <span className="text-xs text-slate-400">Demostración en vivo</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                Así lucirá el dashboard de audiencia una vez analices tu video
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Selecciona uno de tus videos arriba y pulsa <strong className="text-white">Analizar video</strong> para reemplazar estos datos con los comentarios reales de tu comunidad.
              </p>
            </div>
          </div>
          {channelVideos.length > 0 && selectedCount === 0 && (
            <button
              onClick={() => toggleVideoSelection(channelVideos[0].youtubeVideoId)}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-2 flex-shrink-0 shadow-sm"
            >
              <CheckCircle2 size={14} className="text-blue-600" />
              Seleccionar primer video
            </button>
          )}
        </div>
      )}

      {/* Main Executive Analysis Section */}
      {(hasData || isDemoPreview) && activeChannel && (
        <div className="space-y-6">
          {/* Dashboard Scope Bar */}
          {hasData && commentAnalysis?.trackedVideos.some((v) => v.analysisStatus === 'done') && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121624] p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Alcance del reporte:
                </span>
              </div>
              <select
                value={commentViewFilter}
                onChange={(e) => setCommentViewFilter(e.target.value as 'all' | string)}
                className="text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-md truncate"
              >
                <option value="all">Todos los videos analizados ({commentAnalysis.trackedVideos.filter(v => v.analysisStatus === 'done').length})</option>
                {channelVideos
                  .filter((v) => v.analysisStatus === 'done')
                  .map((video) => (
                    <option key={video.id} value={video.id}>
                      {video.title.slice(0, 65)}...
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              label="Comentarios analizados"
              value={formatNumber(stats.totalComments)}
              sublabel={`${stats.coveragePercent}% cobertura de muestra`}
              sparklinePoints={[14, 22, 35, 48, 62, 78, 95]}
              sparklineColor="#3B82F6"
              icon={MessageSquare}
              iconColor="#3B82F6"
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              trendText={`+${stats.commentsPerDay}/día`}
              trendPositive={true}
              trendSubtext="ritmo de comentarios"
            />
            <MetricCard
              label="Audiencia única"
              value={formatNumber(stats.uniqueUsers)}
              sublabel="Personas distintas que comentaron"
              sparklinePoints={[10, 18, 28, 42, 54, 66, 84]}
              sparklineColor="#6366F1"
              icon={Users}
              iconColor="#6366F1"
              iconBg="bg-indigo-50 dark:bg-indigo-950/40"
              trendText="Alto alcance"
              trendPositive={true}
              trendSubtext="diversidad de autores"
            />
            <MetricCard
              label="Densidad diaria"
              value={`${formatNumber(stats.commentsPerDay)}`}
              sublabel="Comentarios / día promedio"
              sparklinePoints={[8, 12, 19, 15, 24, 30, 36]}
              sparklineColor="#10B981"
              icon={BarChart3}
              iconColor="#10B981"
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              trendText={`${sentiment.positive}% apoyo`}
              trendPositive={sentiment.positive >= 50}
              trendSubtext="receptividad neta"
            />
            <MetricCard
              label="Interacción accionable"
              value={`${stats.averageEngagement}%`}
              sublabel="Dudas, sugerencias u objeciones"
              miniGaugePercent={stats.averageEngagement}
              miniGaugeColor="#F59E0B"
              icon={Gauge}
              iconColor="#F59E0B"
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              trendText={`${opportunityCount} ideas`}
              trendPositive={true}
              trendSubtext="detectadas por IA"
            />
          </div>

          {/* Row: Executive Reading & Next Action */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Executive Reading (8 cols) */}
            <div className="xl:col-span-8 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${signal.tone}`}>
                    {signal.label}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                    {scopeText}
                  </span>
                  {engineLabel && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
                      ✨ {engineLabel}
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Lectura ejecutiva de la audiencia
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                {summaryText}
              </p>

              {/* 3 Metric Highlight Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
                {/* Apoyo */}
                <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Apoyo & Positivo
                    </span>
                    <ThumbsUp size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {sentiment.positive}%
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Comentarios con tono receptivo hacia tu contenido
                  </p>
                </div>

                {/* Oportunidades */}
                <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      Oportunidades
                    </span>
                    <Sparkles size={14} className="text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {opportunityCount}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {questions.length} preguntas + {suggestions.length} sugerencias directas
                  </p>
                </div>

                {/* Fricciones */}
                <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Fricciones & Críticas
                    </span>
                    <AlertTriangle size={14} className="text-rose-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {frictionCount}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Objeciones, dudas no resueltas o enlaces rotos
                  </p>
                </div>
              </div>

              {/* Sub-bar stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cobertura analizada</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {stats.coveragePercent}% de los comentarios
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tema más solicitado</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                    {topics[0]?.name ?? 'Sin tema líder'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nivel de riesgo</span>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {alerts.filter((a) => a.priority === 'alta').length} alertas urgentes
                  </p>
                </div>
              </div>
            </div>

            {/* Next Action Card (4 cols) */}
            <div className="xl:col-span-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <SectionHeader
                  title="Próxima acción clave"
                  eyebrow="Recomendación estratégica para tu siguiente video"
                  icon={Compass}
                />
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 mt-3">
                  <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">
                    Sugerencia del algoritmo
                  </p>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                    {compactText(nextActionText, 450)}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] font-bold uppercase text-slate-400">Prioridad actual del canal</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                  {alerts.some((alert) => alert.priority === 'alta')
                    ? '⚠️ Corregir objeciones antes de publicar'
                    : decisionInsights[0]
                    ? `🎯 ${decisionInsights[0].title}`
                    : topics[0]
                    ? `🚀 Producir sobre ${topics[0].name}`
                    : 'Recolectar más comentarios'}
                </p>
              </div>
            </div>
          </div>

          {/* Row: Decision Matrix & Video Insights */}
          {(decisionInsights.length > 0 || videoInsights.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-8 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
                <SectionHeader
                  title="Decisiones recomendadas por IA"
                  eyebrow="Prioridad, acción concreta y evidencia para tu calendario de contenido"
                  icon={ListChecks}
                  badge={`${decisionInsights.length} acciones`}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
                  {decisionInsights.slice(0, 4).map((insight) => (
                    <DecisionInsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              </div>

              <div className="xl:col-span-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
                <SectionHeader
                  title="Videos con más señales"
                  eyebrow="Dónde hay mayor concentración de dudas y oportunidades"
                  icon={Video}
                />
                {videoInsights.length > 0 ? (
                  <div className="space-y-3.5 mt-5">
                    {videoInsights.slice(0, 3).map((insight) => (
                      <VideoInsightRow key={insight.videoId} insight={insight} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-400">
                      Muestra individual de video en análisis.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row: Topic Opportunities & Conversation Health Donut */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Topic Opportunities (7 cols) */}
            <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
              <SectionHeader
                title="Mapa de temas y oportunidades"
                eyebrow="Temas más repetidos en preguntas y sugerencias para convertir en videos"
                icon={Target}
                badge={`${topics.length} temas`}
              />
              {topics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                  {topics.map((topic, index) => (
                    <TopicRow
                      key={topic.name}
                      topic={topic}
                      index={index}
                      maxCount={maxTopicCount}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">
                  Sin temas accionables aún en la muestra.
                </p>
              )}
            </div>

            {/* Conversation Health Donut (5 cols) */}
            <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <SectionHeader
                  title="Salud de la conversación"
                  eyebrow="Desglose por tipo de señal detectada en la comunidad"
                  icon={ThumbsUp}
                />
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                  {categorySegments.length > 0 ? (
                    <DesignDonutChart
                      sizeClass="w-36 h-36"
                      segments={categorySegments}
                      centerLabel={formatNumber(totalCategorySignals)}
                      centerSub="señales"
                      centerLabelClass="text-2xl font-extrabold text-slate-900 dark:text-white"
                      centerSubClass="text-[10px] uppercase font-bold text-slate-400"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                      Sin datos
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-3">
                    <RankedProgressList
                      items={categoryItems}
                      maxCount={Math.max(...categoryItems.map((i) => i.count), 1)}
                    />
                  </div>
                </div>
              </div>

              {/* Sentiment Trio */}
              <div className="grid grid-cols-3 gap-2 text-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                  <p className="text-base font-extrabold text-emerald-600">{sentiment.positive}%</p>
                  <p className="text-[10px] font-semibold text-slate-400">Positivo</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-base font-extrabold text-amber-600">{sentiment.neutral}%</p>
                  <p className="text-[10px] font-semibold text-slate-400">Neutral</p>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="text-base font-extrabold text-rose-600">{sentiment.negative}%</p>
                  <p className="text-[10px] font-semibold text-slate-400">Crítica</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row: FAQs & Suggestions + Alerts */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* FAQs & Community Suggestions (7 cols) */}
            <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
              <SectionHeader
                title="Preguntas frecuentes y pedidos de audiencia"
                eyebrow="Lo que puedes responder en tu siguiente video o fijar en la descripción"
                icon={HelpCircle}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                    Dudas más repetidas
                  </h3>
                  {faqs.length > 0 ? (
                    <div className="space-y-2.5">
                      {faqs.slice(0, 5).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800/60"
                        >
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                            {item.text}
                          </p>
                          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-white dark:bg-[#121624] border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-md flex-shrink-0">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4">No se detectaron preguntas frecuentes.</p>
                  )}
                </div>

                <CommentPreview
                  title="Sugerencias destacadas"
                  comments={suggestions}
                  emptyMessage="No hay sugerencias en este análisis."
                  icon={Lightbulb}
                />
              </div>
            </div>

            {/* Risks & Alerts (5 cols) */}
            <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
              <SectionHeader
                title="Riesgos y alertas accionables"
                eyebrow="Problemas o señales que requieren respuesta preventiva"
                icon={ShieldAlert}
              />
              {alerts.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {alerts.slice(0, 4).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <CommentPreview
                  title="Objeciones y problemas"
                  comments={problems}
                  emptyMessage="No se detectaron alertas críticas en este análisis."
                  icon={AlertTriangle}
                />
              )}
            </div>
          </div>

          {/* AI Strategic Plan Section */}
          {(strategicReport?.actionable_alerts?.length ||
            strategicReport?.content_opportunities?.length ||
            strategicReport?.strategic_recommendations?.length ||
            strategicReport?.engagement_metrics) && (
            <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm space-y-6">
              <SectionHeader
                title="Plan Estratégico Generado por IA"
                eyebrow="Alertas, oportunidades y recomendaciones consolidadas para maximizar retención"
                icon={Sparkles}
              />

              {/* Strategic Alerts by Severity */}
              {strategicReport?.actionable_alerts && strategicReport.actionable_alerts.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Alertas estratégicas consolidadas
                  </h3>
                  <div className="space-y-3">
                    {[...strategicReport.actionable_alerts]
                      .sort((a, b) => {
                        const order = { ROJA: 0, AMARILLA: 1, VERDE: 2 };
                        return order[a.severity] - order[b.severity];
                      })
                      .map((alert, idx) => {
                        const severityStyle = {
                          ROJA: 'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-300',
                          AMARILLA: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
                          VERDE: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
                        }[alert.severity];

                        return (
                          <div key={idx} className={`p-4 rounded-2xl border ${severityStyle}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/30 flex-shrink-0 mt-0.5 uppercase">
                                {alert.severity}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{alert.title}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                  {alert.description}
                                </p>
                                {alert.suggested_action && (
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 bg-white/60 dark:bg-black/20 p-2 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 mr-1.5">
                                      Acción sugerida:
                                    </span>
                                    {alert.suggested_action}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Opportunities & Recommendations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Content Opportunities */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-850/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone size={16} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Oportunidades de contenido
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {(strategicReport?.content_opportunities ?? []).slice(0, 4).map((item) => (
                      <div
                        key={`${item.topic}-${item.priority}`}
                        className="p-3 rounded-xl bg-white dark:bg-[#121624] border border-slate-100 dark:border-slate-800/60"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{item.topic}</p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.priority === 'high'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic Recommendations */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-850/30">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks size={16} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Recomendaciones estratégicas
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {(strategicReport?.strategic_recommendations ?? []).slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#121624] border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Engagement Executive Notes */}
              {strategicReport?.engagement_metrics && (
                <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 bg-slate-50/40 dark:bg-slate-850/20">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Métricas ejecutivas de engagement
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#121624] border border-slate-100 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Patrón de consumo</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {strategicReport.engagement_metrics.consumption_pattern ||
                          `Nivel de participación ${strategicReport.engagement_metrics.participation_level}.`}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#121624] border border-slate-100 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Lealtad de la comunidad</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {strategicReport.engagement_metrics.community_loyalty || 'Alta afinidad observada.'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-[#121624] border border-slate-100 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Potencial viral</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                        {strategicReport.engagement_metrics.viral_potential || 'Temas aptos para Shorts y clips.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resonant Hooks Section */}
          {resonantHooks.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-6 shadow-sm">
              <SectionHeader
                title="Hooks y frases que resonaron"
                eyebrow="Ideas del video que la audiencia repitió textualmente en comentarios"
                icon={Sparkles}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-4">
                {resonantHooks.map((hook) => (
                  <div
                    key={`${hook.videoId}-${hook.hook}`}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800/60"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        "{hook.hook}"
                      </span>
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                        {hook.count} ecos
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate" title={hook.videoTitle}>
                      {hook.videoTitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
