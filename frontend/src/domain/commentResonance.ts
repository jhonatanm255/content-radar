import { Comment, SentimentType, TrackedVideo } from './entities';
import { normalizeCommentText } from './services';

export type EngagementType =
  | 'resonance'
  | 'support'
  | 'criticism'
  | 'question'
  | 'suggestion'
  | 'problem'
  | 'neutral';

export interface EnrichedComment extends Comment {
  contentSentiment: SentimentType;
  engagementType: EngagementType;
  isResonance: boolean;
}

export interface ResonantHook {
  hook: string;
  count: number;
  percentage: number;
  videoTitle: string;
  videoId: string;
}

const CRITICISM_PHRASES = [
  'no me gusta',
  'malo video',
  'mal video',
  'basura',
  'clickbait',
  'peor video',
  'no sirve',
  'odia',
  'hate',
  'cringe',
  'flop',
  'aburre',
  'mentira',
  'fake',
  'estafa',
];

const TITLE_SLANG = [
  'escuelini',
  'escuela',
  'colegio',
  'celular',
  'celularcini',
  'mañana',
  'roblox',
  'rblx',
  'zepeto',
  'minecraft',
];

const EMOJI_PATTERN = /[\p{Emoji}\p{Emoji_Component}]/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_PATTERN, ' ').trim();
}

function elongatedToken(text: string): boolean {
  const cleaned = normalizeCommentText(text).replace(/[^\w]/g, '');
  if (cleaned.length < 3) return false;
  if (/^(no+|noo+|si+|sii+|ya+|bro+)$/.test(cleaned)) return true;
  const collapsed = cleaned.replace(/(.)\1{2,}/g, '$1');
  return cleaned.length >= 5 && new Set(collapsed).size <= 2;
}

function emojiHeavyMinimal(text: string): boolean {
  const without = stripEmojis(text).trim();
  return without.length <= 3 && text.trim().length >= 2;
}

export function extractTitleKeywords(title: string): string[] {
  const normalized = normalizeCommentText(stripEmojis(title));
  const words = [
    ...normalized.match(/[a-z0-9áéíóúñ]+/g) ?? [],
  ].filter((w) => w.length >= 4 || TITLE_SLANG.includes(w));

  for (const slang of TITLE_SLANG) {
    if (normalized.includes(slang) && !words.includes(slang)) {
      words.push(slang);
    }
  }
  if (/no{3,}/i.test(normalized)) words.push('nooo');
  return [...new Set(words)];
}

export function hasCriticism(text: string): boolean {
  const normalized = normalizeCommentText(text);
  return CRITICISM_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function echoesVideoTitle(text: string, title?: string): boolean {
  if (!title) return false;

  const textNorm = normalizeCommentText(stripEmojis(text));
  const titleNorm = normalizeCommentText(stripEmojis(title));

  if (!textNorm && emojiHeavyMinimal(text)) return true;

  const keywords = extractTitleKeywords(title);
  if (keywords.length > 0) {
    const matches = keywords.filter((kw) => textNorm.includes(kw)).length;
    if (matches >= 1 && textNorm.length <= 90) return true;
  }

  if (/no{3,}/i.test(textNorm) && /no{3,}/i.test(titleNorm)) return true;

  if (textNorm.length <= 40) {
    const titleTokens = new Set(titleNorm.match(/[a-z0-9áéíóúñ]{3,}/g) ?? []);
    const textTokens = textNorm.match(/[a-z0-9áéíóúñ]{3,}/g) ?? [];
    if (textTokens.length > 0 && textTokens.every((t) => titleTokens.has(t))) return true;
  }

  return false;
}

export function isResonanceComment(
  text: string,
  title: string | undefined,
  category: Comment['category']
): boolean {
  if (hasCriticism(text)) return false;
  if (category === 'problema' || category === 'pregunta' || category === 'sugerencia') return false;
  if (category === 'elogio') return false;
  if (echoesVideoTitle(text, title)) return true;
  if (elongatedToken(text)) return true;
  if (emojiHeavyMinimal(text) && title) return true;
  return false;
}

export function deriveHookLabel(text: string, title: string): string {
  const titleNorm = normalizeCommentText(stripEmojis(title));
  const keywords = extractTitleKeywords(title);

  if (keywords.some((k) => ['escuelini', 'escuela', 'colegio'].includes(k))) {
    return 'Vuelta a clases / escuelini';
  }
  if (keywords.some((k) => ['celular', 'celularcini'].includes(k))) {
    return 'Sin celular / celularcini';
  }
  if (/no{3,}/i.test(normalizeCommentText(text)) && /no{3,}/i.test(titleNorm)) {
    return 'Eco del hook («nooo» del título)';
  }

  const cleanTitle = stripEmojis(title).trim();
  return cleanTitle.length > 48 ? `${cleanTitle.slice(0, 48)}…` : cleanTitle || 'Hook del video';
}

export function classifyEngagement(
  text: string,
  title: string | undefined,
  category: Comment['category'],
  rawSentiment: SentimentType
): { engagementType: EngagementType; contentSentiment: SentimentType } {
  if (category === 'pregunta') {
    return { engagementType: 'question', contentSentiment: rawSentiment };
  }
  if (category === 'sugerencia') {
    return {
      engagementType: 'suggestion',
      contentSentiment: rawSentiment !== 'negative' ? 'positive' : 'neutral',
    };
  }
  if (category === 'problema') {
    return { engagementType: 'problem', contentSentiment: 'negative' };
  }
  if (category === 'elogio') {
    return { engagementType: 'support', contentSentiment: 'positive' };
  }
  if (isResonanceComment(text, title, category)) {
    return { engagementType: 'resonance', contentSentiment: 'positive' };
  }
  if (rawSentiment === 'negative' && hasCriticism(text)) {
    return { engagementType: 'criticism', contentSentiment: 'negative' };
  }
  return { engagementType: 'neutral', contentSentiment: rawSentiment };
}

export function enrichComments(
  comments: Comment[],
  trackedVideos: TrackedVideo[]
): EnrichedComment[] {
  const videoById = new Map(trackedVideos.map((v) => [v.id, v]));

  return comments.map((comment) => {
    if (comment.engagementType && comment.contentSentiment) {
      return {
        ...comment,
        engagementType: comment.engagementType,
        contentSentiment: comment.contentSentiment,
        isResonance: comment.isResonance ?? comment.engagementType === 'resonance',
      };
    }

    const video = videoById.get(comment.videoId);
    const { engagementType, contentSentiment } = classifyEngagement(
      comment.text,
      video?.title,
      comment.category,
      comment.sentiment
    );
    return {
      ...comment,
      engagementType,
      contentSentiment,
      isResonance: engagementType === 'resonance',
    };
  });
}

export function extractResonantHooks(
  enriched: EnrichedComment[],
  trackedVideos: TrackedVideo[]
): ResonantHook[] {
  const videoById = new Map(trackedVideos.map((v) => [v.id, v]));
  const groups = new Map<string, ResonantHook>();

  enriched
    .filter((c) => c.isResonance)
    .forEach((comment) => {
      const video = videoById.get(comment.videoId);
      if (!video) return;

      const hook = deriveHookLabel(comment.text, video.title);
      const key = `${comment.videoId}::${hook}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        groups.set(key, {
          hook,
          count: 1,
          percentage: 0,
          videoTitle: video.title,
          videoId: video.id,
        });
      }
    });

  const total = enriched.length || 1;
  return [...groups.values()]
    .map((h) => ({ ...h, percentage: Math.round((h.count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

/** Palabras sin valor para insights de contenido */
export const TOPIC_NOISE_WORDS = new Set([
  'noooo',
  'nooo',
  'noo',
  'noooooooo',
  'siuuu',
  'jajaja',
  'jaja',
  'jeje',
  'bro',
  'literal',
  'video',
  'videos',
  'canal',
  'hola',
  'gracias',
  'amo',
  'fav',
  'cumple',
  'feliz',
  'mañana',
  'solo',
  'boy',
  'fui',
  'falte',
]);

export function isNoiseTopicWord(word: string): boolean {
  const normalized = normalizeCommentText(word).replace(/[^\w]/g, '');
  if (TOPIC_NOISE_WORDS.has(normalized)) return true;
  if (/^n+o+$/i.test(normalized)) return true;
  if (/^s+i+$/i.test(normalized)) return true;
  if (normalized.length < 4) return true;
  return false;
}
