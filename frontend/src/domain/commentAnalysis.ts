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

export interface CommentAnalysisSummary {
  stats: CommentStats;
  /** Sentimiento bruto del texto (incluye ecos del hook) */
  sentiment: SentimentBreakdown;
  /** Sentimiento hacia el creador/contenido (excluye resonancia) */
  contentSentiment: SentimentBreakdown;
  resonance: ResonanceStats;
  resonantHooks: ResonantHook[];
  topics: TopicMention[];
  faqs: { text: string; count: number }[];
  alerts: ActionableAlert[];
  trackedVideos: TrackedVideo[];
  commentsByCategory: Record<Comment['category'], Comment[]>;
  lastAnalyzedAt: string | null;
  analysisEngine?: string;
}

/** Temas por nicho — gaming/creator + tech (se evalúan todos) */
const TOPIC_KEYWORDS: { name: string; keywords: string[] }[] = [
  // Gaming / entretenimiento
  { name: 'Roblox', keywords: ['roblox', 'rblx', 'obby', 'tycoon', 'brookhaven'] },
  { name: 'Zepeto', keywords: ['zepeto'] },
  { name: 'Minecraft', keywords: ['minecraft', 'mine craft'] },
  { name: 'Fortnite', keywords: ['fortnite'] },
  { name: 'Juego / Gameplay', keywords: ['juego', 'gameplay', 'partida', 'nivel', 'mapa', 'mision'] },
  { name: 'Skins / Avatar', keywords: ['skin', 'avatar', 'outfit', 'ropa', 'custom'] },
  { name: 'Roleplay / Historia', keywords: ['roleplay', ' rp', 'historia', 'contexto'] },
  { name: 'Cumpleaños / Fandom', keywords: ['cumple', 'feliz cumple', 'felpudos', 'fandom', 'fan'] },
  { name: 'Colaboración', keywords: ['collab', 'colaboracion', 'colaboración', 'duo'] },
  // Tech (canales dev)
  { name: 'Deploy / VPS', keywords: ['vps', 'servidor', 'desplegar', 'deploy', 'hosting'] },
  { name: 'Docker', keywords: ['docker', 'compose', 'contenedor'] },
  { name: 'Coolify', keywords: ['coolify'] },
  { name: 'IA / ChatGPT', keywords: ['chatgpt', 'gpt', 'openai', 'ollama', 'inteligencia artificial'] },
  { name: 'Errores / Bugs', keywords: ['error', 'fallo', 'bug', 'no funciona', 'problema'] },
];

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

function countTopicInComments(
  comments: Comment[],
  keywords: string[],
  categories?: Comment['category'][]
): number {
  return comments.filter((comment) => {
    if (categories && !categories.includes(comment.category)) return false;
    const text = normalizeCommentText(comment.text);
    return keywords.some((kw) =>
      kw.length >= 4 ? containsPhrase(text, kw) : text.includes(kw)
    );
  }).length;
}

function extractVideoThemes(
  comments: Comment[],
  trackedVideos: TrackedVideo[]
): TopicMention[] {
  const videoById = new Map(trackedVideos.map((v) => [v.id, v]));
  const themes = new Map<string, TopicMention>();
  const videosWithComments = [...new Set(comments.map((c) => c.videoId))];

  for (const videoId of videosWithComments) {
    const video = videoById.get(videoId);
    if (!video) continue;

    const videoCommentCount = comments.filter((c) => c.videoId === videoId).length;
    const titleText = normalizeCommentText(video.title);

    for (const topic of TOPIC_KEYWORDS) {
      const inTitle = topic.keywords.some((kw) =>
        kw.length >= 4 ? containsPhrase(titleText, kw) : titleText.includes(kw)
      );
      if (!inTitle) continue;

      const existing = themes.get(topic.name);
      if (existing) {
        existing.count += videoCommentCount;
      } else {
        themes.set(topic.name, {
          name: topic.name,
          count: videoCommentCount,
          percentage: 0,
          source: 'tema_video',
          insight: `Tema central del video «${video.title.slice(0, 40)}${video.title.length > 40 ? '…' : ''}»`,
        });
      }
    }
  }

  const total = comments.length || 1;
  return [...themes.values()]
    .map((t) => ({ ...t, percentage: Math.round((t.count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/** Temas orientados a decisiones de contenido */
export function extractActionableTopics(
  comments: Comment[],
  trackedVideos: TrackedVideo[],
  resonantHooks: ResonantHook[]
): TopicMention[] {
  const total = comments.length || 1;
  const results: TopicMention[] = [];
  const usedNames = new Set<string>();

  const suggestions = comments.filter((c) => c.category === 'sugerencia');
  const questions = comments.filter((c) => c.category === 'pregunta');
  const problems = comments.filter((c) => c.category === 'problema');

  for (const topic of TOPIC_KEYWORDS) {
    const suggestionCount = countTopicInComments(suggestions, topic.keywords);
    const questionCount = countTopicInComments(questions, topic.keywords);
    const problemCount = countTopicInComments(problems, topic.keywords);

    if (suggestionCount >= 1) {
      results.push({
        name: topic.name,
        count: suggestionCount,
        percentage: Math.round((suggestionCount / total) * 100),
        source: 'sugerencia',
        insight: `${suggestionCount} espectador(es) pidieron contenido sobre esto`,
      });
      usedNames.add(topic.name);
    } else if (questionCount >= 2) {
      results.push({
        name: topic.name,
        count: questionCount,
        percentage: Math.round((questionCount / total) * 100),
        source: 'pregunta',
        insight: `Curiosidad recurrente sobre ${topic.name}`,
      });
      usedNames.add(topic.name);
    } else if (problemCount >= 2) {
      results.push({
        name: topic.name,
        count: problemCount,
        percentage: Math.round((problemCount / total) * 100),
        source: 'problema',
        insight: `Problemas reportados relacionados con ${topic.name}`,
      });
      usedNames.add(topic.name);
    }
  }

  const nicheCounts = new Map<string, number>();
  comments.forEach((comment) => {
    const text = normalizeCommentText(comment.text);
    for (const topic of TOPIC_KEYWORDS) {
      if (usedNames.has(topic.name)) continue;
      if (topic.keywords.some((kw) => (kw.length >= 4 ? containsPhrase(text, kw) : text.includes(kw)))) {
        nicheCounts.set(topic.name, (nicheCounts.get(topic.name) ?? 0) + 1);
      }
    }
  });

  [...nicheCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([name, count]) => {
      if (!usedNames.has(name)) {
        results.push({
          name,
          count,
          percentage: Math.round((count / total) * 100),
          source: 'nicho',
          insight: 'Tema recurrente en la conversación',
        });
        usedNames.add(name);
      }
    });

  extractVideoThemes(comments, trackedVideos)
    .filter((t) => !usedNames.has(t.name) && t.count >= 2)
    .slice(0, 2)
    .forEach((t) => {
      results.push(t);
      usedNames.add(t.name);
    });

  resonantHooks.slice(0, 2).forEach((hook) => {
    const label = hook.hook;
    if (usedNames.has(label)) return;
    results.push({
      name: label,
      count: hook.count,
      percentage: hook.percentage,
      source: 'resonancia',
      insight: 'Hook que la audiencia repite — oportunidad de serie o spin-off',
    });
    usedNames.add(label);
  });

  return results
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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
  const problems = comments.filter((c) => c.category === 'problema');
  const suggestions = comments.filter((c) => c.category === 'sugerencia');
  const faqs = buildFaqs(comments);
  const elogios = comments.filter((c) => c.category === 'elogio').length;

  for (const topic of TOPIC_KEYWORDS) {
    const problemCount = countByKeyword(problems, topic.keywords);
    const questionCount = countByKeyword(
      comments.filter((c) => c.category === 'pregunta'),
      topic.keywords
    );

    if (problemCount >= 2) {
      alerts.push({
        id: `alert_problema_${topic.name}`,
        type: 'problema',
        title: `Problemas recurrentes: ${topic.name}`,
        description: `${problemCount} comentarios reportan problemas sobre ${topic.name}.`,
        priority: problemCount >= 4 ? 'alta' : 'media',
      });
    }

    if (questionCount >= 2) {
      alerts.push({
        id: `alert_pregunta_${topic.name}`,
        type: 'pregunta',
        title: `Curiosidad de la audiencia: ${topic.name}`,
        description: `${questionCount} preguntas relacionadas con ${topic.name}.`,
        priority: questionCount >= 4 ? 'alta' : 'media',
      });
    }
  }

  faqs.slice(0, 3).forEach((faq, i) => {
    alerts.push({
      id: `alert_faq_${i}`,
      type: 'pregunta',
      title: faq.count >= 2 ? 'Pregunta frecuente' : 'Pregunta detectada',
      description: `"${faq.text.slice(0, 100)}${faq.text.length > 100 ? '…' : ''}"${faq.count >= 2 ? ` — ${faq.count} veces.` : '.'}`,
      priority: faq.count >= 3 ? 'alta' : 'media',
    });
  });

  const suggestionGroups = new Map<string, number>();
  suggestions.forEach((s) => {
    for (const topic of TOPIC_KEYWORDS) {
      const text = normalizeCommentText(s.text);
      if (topic.keywords.some((kw) => containsPhrase(text, kw))) {
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
        priority: count >= 3 ? 'alta' : 'baja',
      });
    }
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

export function buildCommentAnalysisSummary(
  comments: Comment[],
  trackedVideos: TrackedVideo[],
  analysisEngine?: string
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

  return {
    stats: buildCommentStats(comments, trackedVideos),
    sentiment,
    contentSentiment,
    resonance,
    resonantHooks,
    topics: extractActionableTopics(comments, trackedVideos, resonantHooks),
    faqs: buildFaqs(comments),
    alerts: generateActionableAlerts(
      comments,
      trackedVideos,
      contentSentiment,
      resonance,
      resonantHooks
    ),
    trackedVideos,
    commentsByCategory,
    lastAnalyzedAt:
      analyzedDates.length > 0 ? analyzedDates.sort().reverse()[0] : null,
    analysisEngine,
  };
}
