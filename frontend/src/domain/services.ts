// Pure Business Algorithms

import type { Comment } from './entities';

/**
 * Calcula un puntaje de oportunidad (de 0 a 100) basado en la demanda, competencia y tendencia.
 */
export function calculateOpportunityScore(
  demand: 'Alta' | 'Media' | 'Baja',
  competition: 'Muy Baja' | 'Baja' | 'Media' | 'Alta',
  trendPercentage: number
): number {
  let demandScore = 0;
  if (demand === 'Alta') demandScore = 50;
  else if (demand === 'Media') demandScore = 30;
  else demandScore = 10;

  let competitionScore = 0;
  if (competition === 'Muy Baja') competitionScore = 30;
  else if (competition === 'Baja') competitionScore = 25;
  else if (competition === 'Media') competitionScore = 15;
  else competitionScore = 5;

  const trendBonus = Math.min(20, Math.max(0, (trendPercentage || 0) * 0.2));
  return Math.min(100, Math.round(demandScore + competitionScore + trendBonus));
}

/** Normaliza texto de comentarios de YouTube (minúsculas, sin emojis repetidos) */
export function normalizeCommentText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Coincidencia por palabra/frase completa, no substring (evita "como" dentro de narrativas) */
export function containsPhrase(text: string, phrase: string): boolean {
  const normalized = normalizeCommentText(text);
  const term = normalizeCommentText(phrase);
  if (!term) return false;
  const pattern = new RegExp(`(?:^|[\\s.,!?;:'"¿¡()\\[\\]-])${escapeRegex(term)}(?:$|[\\s.,!?;:'"¿¡()\\[\\]-])`);
  return pattern.test(` ${normalized} `);
}

const POSITIVE_SIGNALS: { phrase: string; weight: number }[] = [
  { phrase: 'te amo', weight: 3 },
  { phrase: 'me encanta', weight: 3 },
  { phrase: 'me gusta', weight: 2 },
  { phrase: 'excelente', weight: 2 },
  { phrase: 'increible', weight: 2 },
  { phrase: 'epico', weight: 2 },
  { phrase: 'hermoso', weight: 2 },
  { phrase: 'hermosa', weight: 2 },
  { phrase: 'buenisimo', weight: 2 },
  { phrase: 'buen video', weight: 2 },
  { phrase: 'buen contenido', weight: 2 },
  { phrase: 'gracias', weight: 2 },
  { phrase: 'crack', weight: 2 },
  { phrase: 'fav', weight: 2 },
  { phrase: 'favorite', weight: 2 },
  { phrase: 'feliz cumple', weight: 2 },
  { phrase: 'bendiciones', weight: 2 },
  { phrase: 'apoyo', weight: 1 },
  { phrase: 'genial', weight: 2 },
  { phrase: 'perfecto', weight: 2 },
  { phrase: 'top', weight: 1 },
  { phrase: 'goat', weight: 2 },
  { phrase: 'god', weight: 1 },
  { phrase: 'lindo', weight: 1 },
  { phrase: 'linda', weight: 1 },
  { phrase: 'cool', weight: 1 },
  { phrase: 'nice', weight: 1 },
  { phrase: 'saludos', weight: 1 },
  { phrase: 'sub', weight: 1 },
  { phrase: 'suscrib', weight: 1 },
  { phrase: 'joya', weight: 2 },
  { phrase: 'espectacular', weight: 2 },
];

const NEGATIVE_SIGNALS: { phrase: string; weight: number }[] = [
  { phrase: 'no me gusta', weight: 3 },
  { phrase: 'no funciona', weight: 3 },
  { phrase: 'clickbait', weight: 3 },
  { phrase: 'mentira', weight: 2 },
  { phrase: 'basura', weight: 3 },
  { phrase: 'trash', weight: 3 },
  { phrase: 'peor', weight: 2 },
  { phrase: 'malisimo', weight: 3 },
  { phrase: 'feo', weight: 2 },
  { phrase: 'odia', weight: 2 },
  { phrase: 'hate', weight: 2 },
  { phrase: 'fake', weight: 2 },
  { phrase: 'estafa', weight: 3 },
  { phrase: 'aburre', weight: 2 },
  { phrase: 'cringe', weight: 2 },
  { phrase: 'flop', weight: 2 },
  { phrase: 'troll', weight: 2 },
  { phrase: 'error', weight: 2 },
  { phrase: 'problema', weight: 2 },
  { phrase: 'no sirve', weight: 2 },
  { phrase: 'frustrante', weight: 2 },
];

const POSITIVE_EMOJIS = /[❤️💕😍🔥🥰✨⭐🌟👏🙌💯😊🎉🎂]/u;
const NEGATIVE_EMOJIS = /[💀😡🤮👎😤]/u;

/**
 * Analiza sentimiento con señales ponderadas + emojis (orientado a comentarios de YouTube en español).
 */
export function analyzeCommentSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  let score = 0;

  for (const { phrase, weight } of POSITIVE_SIGNALS) {
    if (containsPhrase(text, phrase)) score += weight;
  }
  for (const { phrase, weight } of NEGATIVE_SIGNALS) {
    if (containsPhrase(text, phrase)) score -= weight;
  }

  if (POSITIVE_EMOJIS.test(text)) score += 2;
  if (NEGATIVE_EMOJIS.test(text)) score -= 2;

  // Risas suaves → leve positivo en contexto de creator
  if (/\b(jaja|jeje|lol|xd)\b/i.test(text) && score >= 0) score += 1;

  if (score >= 2) return 'positive';
  if (score <= -2) return 'negative';
  return 'neutral';
}

const QUESTION_STARTERS = [
  'que es',
  'qué es',
  'q es',
  'k es',
  'que significa',
  'como se',
  'cómo se',
  'como puedo',
  'cómo puedo',
  'cuando es',
  'cuándo es',
  'cuando sale',
  'cuándo sale',
  'donde esta',
  'dónde está',
  'quien es',
  'quién es',
  'qn es',
  'qn sera',
  'quién será',
  'alguien sabe',
  'saben que',
  'sabes que',
  'me pueden',
  'podrian',
  'podrían',
  'pueden decir',
  'por que',
  'por qué',
  'pq ',
  'pa que',
  'para que',
];

function looksLikeQuestion(text: string): boolean {
  const trimmed = text.trim();
  const normalized = normalizeCommentText(trimmed);

  // Historias largas no son preguntas aunque contengan "como" en una frase narrativa
  if (trimmed.length > 220 && !trimmed.endsWith('?')) return false;

  if (trimmed.endsWith('?') && trimmed.length <= 180) return true;

  if (trimmed.includes('?')) {
    const questionMarks = (trimmed.match(/\?/g) ?? []).length;
    if (questionMarks >= 1 && trimmed.length <= 150) return true;
  }

  return QUESTION_STARTERS.some((starter) => normalized.startsWith(starter) || containsPhrase(trimmed, starter));
}

/**
 * Clasifica categoría del comentario con reglas más estrictas para preguntas.
 */
export function categorizeComment(text: string): Comment['category'] {
  const normalized = normalizeCommentText(text);
  const trimmed = text.trim();

  // Elogios primero (comentarios cortos positivos)
  const praisePhrases = [
    'te amo',
    'me encanta',
    'buen video',
    'buen contenido',
    'gracias',
    'crack',
    'fav',
    'feliz cumple',
    'bendiciones',
    'hermoso',
    'increible',
    'genial',
    'espectacular',
    'sub',
    'suscrib',
    'apoyo',
    'saludos',
    'joya',
    'buenisimo',
  ];
  if (
    praisePhrases.some((p) => containsPhrase(text, p)) ||
    (trimmed.length < 80 && POSITIVE_EMOJIS.test(text))
  ) {
    return 'elogio';
  }

  const problemPhrases = [
    'no funciona',
    'no me sale',
    'no sirve',
    'error',
    'bug',
    'problema',
    'fallo',
    'roto',
    'clickbait',
    'mentira',
    'fake',
    'estafa',
    'no entiendo',
    'no carga',
  ];
  if (problemPhrases.some((p) => containsPhrase(text, p))) {
    return 'problema';
  }

  if (looksLikeQuestion(text)) {
    return 'pregunta';
  }

  const suggestionPhrases = [
    'sugiero',
    'deberias',
    'deberías',
    'haz un video',
    'haz un',
    'hacer un video',
    'podrias hacer',
    'podrías hacer',
    'me gustaria que',
    'me gustaría que',
    'estaria bueno',
    'estaría bueno',
    'habla de',
    'hablen de',
    'sube un video',
    'sube video',
    'proximo video',
    'próximo video',
  ];
  if (suggestionPhrases.some((p) => containsPhrase(text, p))) {
    return 'sugerencia';
  }

  // "como" suelto en narrativa → otro (no pregunta)
  if (normalized.length > 100 && !trimmed.includes('?')) {
    return 'otro';
  }

  return 'otro';
}
