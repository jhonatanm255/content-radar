import { Comment, TrackedVideo } from './entities';

export interface CommentStats {
  totalComments: number;
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
}

export interface ActionableAlert {
  id: string;
  type: 'problema' | 'pregunta' | 'sugerencia' | 'sentimiento' | 'actividad';
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
}

export interface CommentAnalysisSummary {
  stats: CommentStats;
  sentiment: SentimentBreakdown;
  topics: TopicMention[];
  faqs: { text: string; count: number }[];
  alerts: ActionableAlert[];
  trackedVideos: TrackedVideo[];
  commentsByCategory: Record<Comment['category'], Comment[]>;
  lastAnalyzedAt: string | null;
}

const TOPIC_KEYWORDS: { name: string; keywords: string[] }[] = [
  { name: 'Deploy / VPS', keywords: ['vps', 'servidor', 'desplegar', 'deploy', 'hosting', 'hetzner', 'digitalocean'] },
  { name: 'Docker', keywords: ['docker', 'compose', 'contenedor', 'container'] },
  { name: 'Coolify', keywords: ['coolify'] },
  { name: 'Kubernetes', keywords: ['kubernetes', 'k8s', 'helm'] },
  { name: 'Next.js', keywords: ['next.js', 'nextjs', 'next js'] },
  { name: 'IA Local', keywords: ['ollama', 'llama', 'ia local', 'openai', 'gpt'] },
  { name: 'Errores / Problemas', keywords: ['error', 'fallo', 'bug', 'no funciona', 'problema'] },
  { name: 'Dominio / SSL', keywords: ['dominio', 'ssl', 'certificado', 'nginx', 'proxy'] },
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function buildCommentStats(comments: Comment[]): CommentStats {
  if (comments.length === 0) {
    return { totalComments: 0, uniqueUsers: 0, commentsPerDay: 0, averageEngagement: 0 };
  }

  const uniqueUsers = new Set(comments.map((c) => c.authorName.toLowerCase())).size;
  const dates = comments.map((c) => new Date(c.publishedAt).getTime()).filter(Boolean);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const daySpan = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
  const commentsPerDay = Math.round(comments.length / daySpan);

  const engagementComments = comments.filter(
    (c) => c.category === 'pregunta' || c.category === 'sugerencia' || c.category === 'problema'
  );
  const averageEngagement =
    comments.length > 0
      ? Math.round((engagementComments.length / comments.length) * 100) / 10
      : 0;

  return {
    totalComments: comments.length,
    uniqueUsers,
    commentsPerDay,
    averageEngagement,
  };
}

export function buildSentimentBreakdown(comments: Comment[]): SentimentBreakdown {
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

export function extractTopics(comments: Comment[]): TopicMention[] {
  const topicCounts = new Map<string, number>();
  let matchedComments = 0;

  comments.forEach((comment) => {
    const text = normalizeText(comment.text);
    let matched = false;

    for (const topic of TOPIC_KEYWORDS) {
      if (topic.keywords.some((kw) => text.includes(kw))) {
        topicCounts.set(topic.name, (topicCounts.get(topic.name) ?? 0) + 1);
        matched = true;
      }
    }

    if (matched) matchedComments++;
  });

  const unmatched = comments.length - matchedComments;
  if (unmatched > 0) {
    topicCounts.set('Otros', unmatched);
  }

  const sorted = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const total = comments.length || 1;
  return sorted.map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

export function buildFaqs(comments: Comment[]): { text: string; count: number }[] {
  const questions = comments.filter((c) => c.category === 'pregunta');
  const groups = new Map<string, { text: string; count: number }>();

  questions.forEach((q) => {
    const key = normalizeText(q.text).slice(0, 80);
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
    const text = normalizeText(c.text);
    return keywords.some((kw) => text.includes(kw));
  }).length;
}

export function generateActionableAlerts(
  comments: Comment[],
  trackedVideos: TrackedVideo[],
  sentiment: SentimentBreakdown
): ActionableAlert[] {
  const alerts: ActionableAlert[] = [];
  const problems = comments.filter((c) => c.category === 'problema');
  const suggestions = comments.filter((c) => c.category === 'sugerencia');
  const faqs = buildFaqs(comments);

  for (const topic of TOPIC_KEYWORDS) {
    const count = countByKeyword(problems, topic.keywords);
    if (count >= 3) {
      alerts.push({
        id: `alert_problema_${topic.name}`,
        type: 'problema',
        title: `Problemas recurrentes: ${topic.name}`,
        description: `${count} comentarios reportan problemas relacionados con ${topic.name}. Considera un video de troubleshooting.`,
        priority: count >= 5 ? 'alta' : 'media',
      });
    }
  }

  faqs.slice(0, 3).forEach((faq, i) => {
    if (faq.count >= 2) {
      alerts.push({
        id: `alert_faq_${i}`,
        type: 'pregunta',
        title: 'Pregunta frecuente detectada',
        description: `"${faq.text.slice(0, 100)}${faq.text.length > 100 ? '…' : ''}" — ${faq.count} veces.`,
        priority: faq.count >= 5 ? 'alta' : 'media',
      });
    }
  });

  const suggestionGroups = new Map<string, number>();
  suggestions.forEach((s) => {
    for (const topic of TOPIC_KEYWORDS) {
      const text = normalizeText(s.text);
      if (topic.keywords.some((kw) => text.includes(kw))) {
        suggestionGroups.set(topic.name, (suggestionGroups.get(topic.name) ?? 0) + 1);
      }
    }
  });

  suggestionGroups.forEach((count, topic) => {
    if (count >= 2) {
      alerts.push({
        id: `alert_sugerencia_${topic}`,
        type: 'sugerencia',
        title: `Contenido demandado: ${topic}`,
        description: `${count} espectadores sugieren contenido sobre ${topic}.`,
        priority: count >= 4 ? 'alta' : 'baja',
      });
    }
  });

  if (sentiment.negative >= 25) {
    alerts.push({
      id: 'alert_sentimiento_negativo',
      type: 'sentimiento',
      title: 'Sentimiento negativo elevado',
      description: `El ${sentiment.negative}% de los comentarios analizados son negativos. Revisa los videos recientes con más quejas.`,
      priority: sentiment.negative >= 35 ? 'alta' : 'media',
    });
  }

  const recentVideos = [...trackedVideos]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

  recentVideos.forEach((video) => {
    const videoComments = comments.filter((c) => c.videoId === video.id);
    if (videoComments.length >= 20) {
      alerts.push({
        id: `alert_actividad_${video.id}`,
        type: 'actividad',
        title: 'Alto engagement en video reciente',
        description: `"${video.title.slice(0, 60)}${video.title.length > 60 ? '…' : ''}" tiene ${videoComments.length} comentarios analizados.`,
        priority: 'baja',
      });
    }
  });

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  return alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export function buildCommentAnalysisSummary(
  comments: Comment[],
  trackedVideos: TrackedVideo[]
): CommentAnalysisSummary {
  const sentiment = buildSentimentBreakdown(comments);
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

  return {
    stats: buildCommentStats(comments),
    sentiment,
    topics: extractTopics(comments),
    faqs: buildFaqs(comments),
    alerts: generateActionableAlerts(comments, trackedVideos, sentiment),
    trackedVideos,
    commentsByCategory,
    lastAnalyzedAt:
      analyzedDates.length > 0
        ? analyzedDates.sort().reverse()[0]
        : null,
  };
}
