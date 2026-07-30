import { Comment, TrackedVideo } from './entities';
import {
  enrichComments,
  extractResonantHooks,
  ResonantHook,
} from './commentResonance';
import { normalizeCommentText, containsPhrase } from './services';

export interface CommentStats {
  totalComments: number;
  /** Total de comentarios en YouTube para los videos en alcance */
  totalAvailable: number;
  /** Porcentaje de comentarios analizados vs disponibles en YouTube */
  coveragePercent: number;
  uniqueUsers: number;
  commentsPerDay: number;
  averageEngagement: number;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface TopicMention {
  name: string;
  count: number;
  percentage: number;
  source?: 'sugerencia' | 'pregunta' | 'problema' | 'tema_video' | 'nicho' | 'resonancia';
  insight?: string;
  score?: number;
  evidence?: string;
}

export interface ResonanceStats {
  count: number;
  percentage: number;
}

export interface ActionableAlert {
  id: string;
  type: 'problema' | 'pregunta' | 'sugerencia' | 'sentimiento' | 'actividad';
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
}

export interface DecisionInsight {
  id: string;
  title: string;
  action: string;
  rationale: string;
  evidence: string;
  priority: 'alta' | 'media' | 'baja';
  type: 'crear' | 'responder' | 'corregir' | 'duplicar';
  confidence: number;
}

export interface VideoAnalysisInsight {
  videoId: string;
  title: string;
  comments: number;
  availableComments: number;
  coveragePercent: number;
  actionableCount: number;
  actionablePercent: number;
  positivePercent: number;
  negativePercent: number;
  topSignal: string;
}

export interface CommentAnalysisSummary {
  stats: CommentStats;
  /** Sentimiento bruto del texto (incluye ecos del hook) */
  sentiment: SentimentBreakdown;
  /** Sentimiento hacia el creador/contenido (excluye resonancia) */
  contentSentiment: SentimentBreakdown;
  resonance: ResonanceStats;
  resonantHooks: ResonantHook[];
  topics: TopicMention[];
  decisionInsights: DecisionInsight[];
  videoInsights: VideoAnalysisInsight[];
  faqs: { text: string; count: number }[];
  alerts: ActionableAlert[];
  trackedVideos: TrackedVideo[];
  commentsByCategory: Record<Comment['category'], Comment[]>;
  lastAnalyzedAt: string | null;
  analysisEngine?: string;
  analysisReport?: string;
  strategicReport?: StrategicReport;
}

export function parseStrategicReport(raw?: Record<string, unknown>): StrategicReport | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  if (!('status' in raw)) return undefined;
  return raw as unknown as StrategicReport;
}

export function pickStrategicReportFromVideos(videos: TrackedVideo[]): StrategicReport | undefined {
  const sorted = [...videos]
    .filter((v) => v.strategicReport)
    .sort((a, b) => {
      const da = a.commentsAnalyzedAt ? new Date(a.commentsAnalyzedAt).getTime() : 0;
      const db = b.commentsAnalyzedAt ? new Date(b.commentsAnalyzedAt).getTime() : 0;
      return db - da;
    });

  for (const video of sorted) {
    const parsed = parseStrategicReport(video.strategicReport);
    if (parsed?.status === 'success') return parsed;
  }
  return undefined;
}

function extractLlmTopics(comments: Comment[]): TopicMention[] {
  const total = comments.length || 1;
  const counts = new Map<string, { name: string; count: number; sources: Set<string>; examples: string[] }>();

  comments.forEach((comment) => {
    if (comment.isResonance || comment.engagementType === 'resonance') return;
    
    // Ignorar comentarios que son elogios o genéricos para el mapa de oportunidades
    if (!['pregunta', 'sugerencia', 'problema'].includes(comment.category)) return;

    const topic = comment.topic?.trim();
    if (!topic || topic.length < 2) return;
    if (/^(general|otro|sin tema|n\/a|na)$/i.test(topic)) return;

    const displayName = topic.charAt(0).toUpperCase() + topic.slice(1);
    const key = normalizeCommentText(displayName);
    const existing = counts.get(key) ?? {
      name: displayName,
      count: 0,
      sources: new Set<string>(),
      examples: [],
    };
    existing.count += 1;
    if (comment.category === 'sugerencia') existing.sources.add('sugerencia');
    else if (comment.category === 'pregunta') existing.sources.add('pregunta');
    else if (comment.category === 'problema') existing.sources.add('problema');
    if (existing.examples.length < 2) existing.examples.push(comment.text);
    counts.set(key, existing);
  });

  return [...counts.values()]
    .filter((data) => data.count >= 2)
    .map((data) => {
      let source: TopicMention['source'] = 'nicho';
      if (data.sources.has('sugerencia')) source = 'sugerencia';
      else if (data.sources.has('pregunta')) source = 'pregunta';
      else if (data.sources.has('problema')) source = 'problema';

      const insightBySource: Record<string, string> = {
        sugerencia: 'Tema detectado por IA en sugerencias de la audiencia',
        pregunta: 'Curiosidad recurrente identificada por IA',
        problema: 'Problema reportado identificado por IA',
        nicho: 'Tema recurrente detectado por IA en los comentarios',
      };
      const score =
        data.count +
        (data.sources.has('sugerencia') ? 8 : 0) +
        (data.sources.has('pregunta') ? 5 : 0) +
        (data.sources.has('problema') ? 4 : 0);

      const evidence = data.examples[0] ?? '';
      const formattedInsight = evidence.length > 90 ? `"${evidence.slice(0, 90)}..."` : `"${evidence}"`;

      return {
        name: data.name,
        count: data.count,
        percentage: Math.round((data.count / total) * 100),
        source,
        score,
        evidence: evidence,
        insight: formattedInsight,
      };
    })
    .sort((a, b) => (b.score ?? b.count) - (a.score ?? a.count))
    .slice(0, 6);
}

// Interfaces para análisis estratégico profundo
export interface StrategicReport {
  status: 'success' | 'error';
  message?: string;
  summary?: string;
  sentiment_analysis?: {
    positive_percent: number;
    neutral_percent: number;
    negative_percent: number;
    nuances: string;
  };
  engagement_metrics?: {
    participation_level: 'baja' | 'media' | 'alta';
    consumption_pattern: string;
    community_loyalty: string;
    viral_potential: string;
  };
  actionable_alerts?: Array<{
    severity: 'ROJA' | 'AMARILLA' | 'VERDE';
    title: string;
    description: string;
    suggested_action: string;
  }>;
  content_opportunities?: Array<{
    topic: string;
    source: 'direct' | 'implicit';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  strategic_recommendations?: string[];
  next_steps?: string;
  video_title?: string;
  channel_name?: string;
  total_comments?: number;
}


const STOPWORDS = new Set([
  'para', 'como', 'pero', 'porque', 'este', 'esta', 'esto', 'ese', 'esa', 'eso',
  'muy', 'mas', 'más', 'tan', 'del', 'los', 'las', 'una', 'uno', 'con', 'sin',
  'que', 'por', 'the', 'and', 'you', 'your', 'video', 'videos', 'canal', 'hola',
  'jaja', 'jeje', 'xd', 'lol', 'fue', 'ser', 'son', 'era', 'solo', 'aqui', 'aquí',
  'asi', 'así', 'bien', 'mal', 'todo', 'toda', 'todos', 'cuando', 'donde', 'dónde',
  'tiene', 'tengo', 'hace', 'hacer', 'ver', 'vez', 'algo', 'aun', 'aún', 'soy',
  'first', 'second', 'third', 'hype', 'chat', 'bro', 'literal',
]);

function isValidFaqText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 8 || trimmed.length > 160) return false;
  if (trimmed.length > 100 && !trimmed.endsWith('?')) return false;
  // Excluir narrativas / contexto
  if (/^contexto[:\s]/i.test(trimmed)) return false;
  if ((trimmed.match(/\./g) ?? []).length >= 3) return false;
  return trimmed.includes('?') || /^(que|qué|q |k |como|cómo|cuando|cuándo|donde|dónde|quien|quién|qn|pq|por que|por qué)/i.test(trimmed);
}

export function buildCommentStats(
  comments: Comment[],
  trackedVideos: TrackedVideo[] = []
): CommentStats {
  const videoIds = new Set(comments.map((c) => c.videoId));
  const totalAvailable = trackedVideos
    .filter((v) => videoIds.has(v.id))
    .reduce((sum, v) => sum + v.commentCount, 0);
  const coveragePercent =
    totalAvailable > 0
      ? Math.round((comments.length / totalAvailable) * 100)
      : comments.length > 0
        ? 100
        : 0;

  if (comments.length === 0) {
    return {
      totalComments: 0,
      totalAvailable,
      coveragePercent: 0,
      uniqueUsers: 0,
      commentsPerDay: 0,
      averageEngagement: 0,
    };
  }

  const uniqueUsers = new Set(comments.map((c) => c.authorName.toLowerCase())).size;
  const uniqueDays = new Set(
    comments.map((c) => new Date(c.publishedAt).toISOString().split('T')[0])
  ).size;
  const daySpan = Math.max(1, uniqueDays);
  const commentsPerDay = Math.round((comments.length / daySpan) * 10) / 10;

  const engagementComments = comments.filter(
    (c) => c.category === 'pregunta' || c.category === 'sugerencia' || c.category === 'problema'
  );
  const averageEngagement =
    comments.length > 0
      ? Math.round((engagementComments.length / comments.length) * 100) / 10
      : 0;

  return {
    totalComments: comments.length,
    totalAvailable,
    coveragePercent,
    uniqueUsers,
    commentsPerDay,
    averageEngagement,
  };
}

export function buildSentimentBreakdown(
  comments: Array<{ sentiment: Comment['sentiment'] }>
): SentimentBreakdown {
  if (comments.length === 0) {
    return { positive: 0, neutral: 0, negative: 0 };
  }

  const counts = { positive: 0, neutral: 0, negative: 0 };
  comments.forEach((c) => counts[c.sentiment]++);

  const total = comments.length;
  return {
    positive: Math.round((counts.positive / total) * 100),
    neutral: Math.round((counts.neutral / total) * 100),
    negative: Math.round((counts.negative / total) * 100),
  };
}

function buildResonanceStats(enriched: ReturnType<typeof enrichComments>): ResonanceStats {
  const count = enriched.filter((c) => c.isResonance).length;
  const total = enriched.length || 1;
  return {
    count,
    percentage: Math.round((count / total) * 100),
  };
}



/** Temas orientados a decisiones de contenido basados dinámicamente en IA */
export function extractActionableTopics(
  comments: Comment[],
  _trackedVideos: TrackedVideo[],
  _resonantHooks: ResonantHook[],
  strategicReport?: StrategicReport
): TopicMention[] {
  const llmTopics = extractLlmTopics(comments);
  const results: TopicMention[] = [];
  const usedNames = new Set<string>();

  if (strategicReport?.content_opportunities) {
    strategicReport.content_opportunities.forEach((opp) => {
      const match = llmTopics.find(t => t.name.toLowerCase() === opp.topic.toLowerCase());
      results.push({
        name: opp.topic,
        count: match ? match.count : Math.max(2, Math.floor(comments.length * 0.05)),
        percentage: match ? match.percentage : 1, 
        source: opp.source === 'direct' ? 'sugerencia' : 'nicho',
        insight: opp.description,
        score: opp.priority === 'high' ? 100 : 80,
      });
      usedNames.add(opp.topic.toLowerCase());
    });
  }

  llmTopics.forEach(topic => {
    if (!usedNames.has(topic.name.toLowerCase())) {
        results.push(topic);
    }
  });

  return results.sort((a, b) => (b.score ?? b.count) - (a.score ?? a.count)).slice(0, 6);
}
export function buildFaqs(comments: Comment[]): { text: string; count: number }[] {
  const questions = comments.filter(
    (c) => c.category === 'pregunta' && isValidFaqText(c.text)
  );
  const groups = new Map<string, { text: string; count: number }>();

  questions.forEach((q) => {
    const key = normalizeCommentText(q.text)
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .slice(0, 8)
      .join(' ');

    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { text: q.text.trim(), count: 1 });
    }
  });

  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function countByKeyword(comments: Comment[], keywords: string[]): number {
  return comments.filter((c) => {
    const text = normalizeCommentText(c.text);
    return keywords.some((kw) => containsPhrase(text, kw) || text.includes(kw));
  }).length;
}

export function generateActionableAlerts(
  comments: Comment[],
  trackedVideos: TrackedVideo[],
  contentSentiment: SentimentBreakdown,
  resonance: ResonanceStats,
  resonantHooks: ResonantHook[]
): ActionableAlert[] {
  const alerts: ActionableAlert[] = [];
  const faqs = buildFaqs(comments);
  const elogios = comments.filter((c) => c.category === 'elogio').length;

  const llmTopics = extractLlmTopics(comments);
  llmTopics.forEach((topic) => {
    if (topic.source === 'problema' && topic.count >= 2) {
      alerts.push({
        id: `alert_problema_${topic.name}`,
        type: 'problema',
        title: `Problemas recurrentes: ${topic.name}`,
        description: `${topic.count} comentarios reportan problemas sobre ${topic.name}.`,
        priority: topic.count >= 4 ? 'alta' : 'media',
      });
    } else if (topic.source === 'pregunta' && topic.count >= 2) {
      alerts.push({
        id: `alert_pregunta_${topic.name}`,
        type: 'pregunta',
        title: `Curiosidad de la audiencia: ${topic.name}`,
        description: `${topic.count} preguntas relacionadas con ${topic.name}.`,
        priority: topic.count >= 4 ? 'alta' : 'media',
      });
    } else if (topic.source === 'sugerencia' && topic.count >= 2) {
      alerts.push({
        id: `alert_sugerencia_${topic.name}`,
        type: 'sugerencia',
        title: `Contenido demandado: ${topic.name}`,
        description: `${topic.count} espectadores sugieren contenido sobre ${topic.name}.`,
        priority: topic.count >= 3 ? 'alta' : 'baja',
      });
    }
  });

  faqs.slice(0, 3).forEach((faq, i) => {
    alerts.push({
      id: `alert_faq_${i}`,
      type: 'pregunta',
      title: faq.count >= 2 ? 'Pregunta frecuente' : 'Pregunta detectada',
      description: `"${faq.text.slice(0, 100)}${faq.text.length > 100 ? '…' : ''}"${faq.count >= 2 ? ` — ${faq.count} veces.` : '.'}`,
      priority: faq.count >= 3 ? 'alta' : 'media',
    });
  });

  if (contentSentiment.positive >= 40 && elogios >= 5) {
    alerts.push({
      id: 'alert_sentimiento_positivo',
      type: 'sentimiento',
      title: 'Audiencia muy positiva',
      description: `El ${contentSentiment.positive}% de los comentarios expresan apoyo hacia tu contenido. Buen momento para pedir suscripciones o lanzar merch.`,
      priority: 'baja',
    });
  }

  if (resonance.percentage >= 25 && resonance.count >= 3) {
    const topHook = resonantHooks[0];
    alerts.push({
      id: 'alert_resonancia_hook',
      type: 'actividad',
      title: 'Hook que resonó con la audiencia',
      description: topHook
        ? `El ${resonance.percentage}% de comentarios repiten el tema «${topHook.hook}». Considera una serie o spin-off.`
        : `El ${resonance.percentage}% de comentarios son ecos del hook del video (empatía, no crítica).`,
      priority: 'media',
    });
  }

  if (contentSentiment.negative >= 20) {
    alerts.push({
      id: 'alert_sentimiento_negativo',
      type: 'sentimiento',
      title: 'Crítica hacia tu contenido',
      description: `El ${contentSentiment.negative}% de comentarios expresan crítica real hacia tu contenido (excluyendo ecos del hook).`,
      priority: contentSentiment.negative >= 30 ? 'alta' : 'media',
    });
  }

  const recentVideos = [...trackedVideos]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

  recentVideos.forEach((video) => {
    const videoComments = comments.filter((c) => c.videoId === video.id);
    if (videoComments.length >= 10) {
      alerts.push({
        id: `alert_actividad_${video.id}`,
        type: 'actividad',
        title: 'Alto engagement en video reciente',
        description: `"${video.title.slice(0, 60)}${video.title.length > 60 ? '…' : ''}" — ${videoComments.length} comentarios.`,
        priority: 'baja',
      });
    }
  });

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  return alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function topicAction(topic: TopicMention): string {
  if (topic.source === 'problema') return `Crea un video corto aclarando o resolviendo "${topic.name}".`;
  if (topic.source === 'pregunta') return `Convierte "${topic.name}" en un video de respuesta rápida o FAQ.`;
  if (topic.source === 'sugerencia') return `Prioriza una pieza nueva sobre "${topic.name}".`;
  return `Explora "${topic.name}" como ángulo para el próximo contenido.`;
}

function buildDecisionInsights(
  comments: Comment[],
  topics: TopicMention[],
  faqs: { text: string; count: number }[],
  alerts: ActionableAlert[],
  contentSentiment: SentimentBreakdown,
  resonance: ResonanceStats,
  resonantHooks: ResonantHook[],
  strategicReport?: StrategicReport
): DecisionInsight[] {
  const insights: DecisionInsight[] = [];
  const total = Math.max(comments.length, 1);

  if (strategicReport?.actionable_alerts && strategicReport.actionable_alerts.length > 0) {
    strategicReport.actionable_alerts
      .filter((a) => a.severity === 'ROJA' || a.severity === 'AMARILLA')
      .slice(0, 2)
      .forEach((alert, i) => {
        insights.push({
          id: `strat_alert_${i}`,
          title: alert.title,
          action: alert.suggested_action,
          rationale: alert.description,
          evidence: 'Alerta estratégica detectada por IA.',
          priority: alert.severity === 'ROJA' ? 'alta' : 'media',
          type: 'corregir',
          confidence: alert.severity === 'ROJA' ? 95 : 85,
        });
      });
  } else {
    const highAlert = alerts.find((alert) => alert.priority === 'alta');
    if (highAlert) {
      insights.push({
        id: `fix_${highAlert.id}`,
        title: highAlert.title,
        action: highAlert.description,
        rationale: 'Hay una señal de riesgo con prioridad alta que puede afectar la percepción del contenido.',
        evidence: highAlert.description,
        priority: 'alta',
        type: 'corregir',
        confidence: 90,
      });
    }
  }

  if (strategicReport?.content_opportunities && strategicReport.content_opportunities.length > 0) {
    strategicReport.content_opportunities.slice(0, 4).forEach((opp, i) => {
      insights.push({
        id: `strat_opp_${i}`,
        title: opp.topic,
        action: opp.description,
        rationale: 'Oportunidad de contenido sugerida estratégicamente por IA basada en análisis profundo.',
        evidence: opp.source === 'direct' ? 'Peticiones explícitas de la audiencia.' : 'Fricciones o necesidades implícitas detectadas.',
        priority: opp.priority === 'high' ? 'alta' : 'media',
        type: 'crear',
        confidence: 95
      });
    });
  } else {
    topics.slice(0, 3).forEach((topic, index) => {
      const confidence = Math.min(95, 55 + (topic.score ?? topic.count) * 3);
      insights.push({
        id: `topic_${normalizeCommentText(topic.name).replace(/\s+/g, '_')}_${index}`,
        title: topic.name,
        action: topicAction(topic),
        rationale: topic.insight ?? 'Tema con señales repetidas en los comentarios.',
        evidence: topic.evidence ?? `${topic.count} menciones (${topic.percentage}% de la muestra).`,
        priority: index === 0 || topic.source === 'sugerencia' ? 'alta' : 'media',
        type: topic.source === 'problema' ? 'corregir' : 'crear',
        confidence,
      });
    });
  }

  if (faqs[0]) {
    insights.push({
      id: 'faq_top',
      title: 'Pregunta recurrente',
      action: `Responde explícitamente: "${faqs[0].text}"`,
      rationale: 'Las preguntas repetidas suelen convertirse bien en Shorts, comentarios fijados o intro de un video largo.',
      evidence: `${faqs[0].count} aparición(es) detectadas.`,
      priority: faqs[0].count >= 2 ? 'alta' : 'media',
      type: 'responder',
      confidence: Math.min(90, 60 + faqs[0].count * 10),
    });
  }

  if (resonance.percentage >= 20 && resonantHooks[0]) {
    insights.push({
      id: 'resonance_hook',
      title: 'Hook con tracción',
      action: `Reutiliza o continúa el hook "${resonantHooks[0].hook}" con una variación nueva.`,
      rationale: 'La audiencia está repitiendo el concepto; eso suele indicar memorabilidad y potencial de serie.',
      evidence: `${resonantHooks[0].count} ecos (${resonance.percentage}% de la muestra).`,
      priority: resonance.percentage >= 35 ? 'alta' : 'media',
      type: 'duplicar',
      confidence: Math.min(92, 50 + resonance.percentage),
    });
  }

  if (contentSentiment.negative >= 25) {
    insights.push({
      id: 'sentiment_negative',
      title: 'Crítica elevada',
      action: 'Antes del siguiente video, publica una respuesta corta o ajusta edición, promesa o expectativa.',
      rationale: 'El sentimiento crítico hacia el contenido supera el umbral saludable para una comunidad receptiva.',
      evidence: `${contentSentiment.negative}% de crítica sobre ${total} comentarios analizados.`,
      priority: contentSentiment.negative >= 35 ? 'alta' : 'media',
      type: 'corregir',
      confidence: Math.min(94, 55 + contentSentiment.negative),
    });
  }

  const typeOrder = { corregir: 0, crear: 1, responder: 2, duplicar: 3 };
  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  const seen = new Set<string>();

  return insights
    .filter((insight) => {
      const key = `${insight.type}_${normalizeCommentText(insight.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;
      return b.confidence - a.confidence;
    })
    .slice(0, 6);
}

function buildVideoInsights(
  comments: Comment[],
  trackedVideos: TrackedVideo[]
): VideoAnalysisInsight[] {
  return trackedVideos
    .map((video) => {
      const videoComments = comments.filter((comment) => comment.videoId === video.id);
      const total = videoComments.length;
      const actionable = videoComments.filter((comment) =>
        comment.category === 'pregunta' ||
        comment.category === 'sugerencia' ||
        comment.category === 'problema'
      ).length;
      const sentiment = buildSentimentBreakdown(
        videoComments.map((comment) => ({
          sentiment: comment.contentSentiment ?? comment.sentiment,
        }))
      );

      const categoryCounts = {
        pregunta: videoComments.filter((comment) => comment.category === 'pregunta').length,
        sugerencia: videoComments.filter((comment) => comment.category === 'sugerencia').length,
        problema: videoComments.filter((comment) => comment.category === 'problema').length,
        elogio: videoComments.filter((comment) => comment.category === 'elogio').length,
      };
      const topSignal = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'sin señal';

      return {
        videoId: video.id,
        title: video.title,
        comments: total,
        availableComments: video.commentCount,
        coveragePercent:
          video.commentCount > 0 ? Math.round((total / video.commentCount) * 100) : total > 0 ? 100 : 0,
        actionableCount: actionable,
        actionablePercent: total > 0 ? Math.round((actionable / total) * 100) : 0,
        positivePercent: sentiment.positive,
        negativePercent: sentiment.negative,
        topSignal,
      };
    })
    .filter((insight) => insight.comments > 0)
    .sort((a, b) => b.actionableCount - a.actionableCount)
    .slice(0, 5);
}

export function buildCommentAnalysisSummary(
  comments: Comment[],
  trackedVideos: TrackedVideo[],
  analysisEngine?: string,
  analysisReport?: string,
  strategicReport?: StrategicReport
): CommentAnalysisSummary {
  const enriched = enrichComments(comments, trackedVideos);
  const forContentDonut = enriched
    .filter((c) => !c.isResonance)
    .map((c) => ({ sentiment: c.contentSentiment }));

  const sentiment = buildSentimentBreakdown(enriched);
  const contentSentiment = buildSentimentBreakdown(
    forContentDonut.length > 0
      ? forContentDonut
      : enriched.map((c) => ({ sentiment: c.contentSentiment }))
  );
  const resonance = buildResonanceStats(enriched);
  const resonantHooks = extractResonantHooks(enriched, trackedVideos);

  const analyzedDates = trackedVideos
    .map((v) => v.commentsAnalyzedAt)
    .filter(Boolean) as string[];

  const commentsByCategory: Record<Comment['category'], Comment[]> = {
    pregunta: [],
    sugerencia: [],
    problema: [],
    elogio: [],
    otro: [],
  };
  comments.forEach((c) => commentsByCategory[c.category].push(c));
  const finalStrategicReport = strategicReport ?? pickStrategicReportFromVideos(trackedVideos);
  const topics = extractActionableTopics(enriched, trackedVideos, resonantHooks, finalStrategicReport);
  const faqs = buildFaqs(comments);
  const alerts = generateActionableAlerts(
    comments,
    trackedVideos,
    contentSentiment,
    resonance,
    resonantHooks
  );

  return {
    stats: buildCommentStats(comments, trackedVideos),
    sentiment,
    contentSentiment,
    resonance,
    resonantHooks,
    topics,
    decisionInsights: buildDecisionInsights(
      enriched,
      topics,
      faqs,
      alerts,
      contentSentiment,
      resonance,
      resonantHooks,
      finalStrategicReport
    ),
    videoInsights: buildVideoInsights(enriched, trackedVideos),
    faqs,
    alerts,
    trackedVideos,
    commentsByCategory,
    lastAnalyzedAt:
      analyzedDates.length > 0 ? analyzedDates.sort().reverse()[0] : null,
    analysisEngine,
    analysisReport,
    strategicReport: finalStrategicReport,
  };
}
