// Pure Business Algorithms

/**
 * Calcula un puntaje de oportunidad (de 0 a 100) basado en la demanda, competencia y tendencia.
 */
export function calculateOpportunityScore(
  demand: 'Alta' | 'Media' | 'Baja',
  competition: 'Muy Baja' | 'Baja' | 'Media' | 'Alta',
  trendPercentage: number // ej. 34%
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

  // Si la tendencia es positiva, suma puntos extras, hasta un tope de 20 puntos
  const trendBonus = Math.min(20, Math.max(0, (trendPercentage || 0) * 0.2));

  return Math.min(100, Math.round(demandScore + competitionScore + trendBonus));
}

/**
 * Analiza el sentimiento de un comentario basado en un análisis heurístico local.
 */
export function analyzeCommentSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lowercase = text.toLowerCase();
  const positiveWords = ['excelente', 'bueno', 'gracias', 'me encanta', 'genial', 'buenisimo', 'buenísimo', 'crack', 'super', 'súper', 'top', 'perfecto', 'mejor', 'util', 'útil', 'bien', 'buena'];
  const negativeWords = ['malo', 'no funciona', 'error', 'fallo', 'basura', 'peor', 'duda', 'problema', 'no sirve', 'bug', 'fallando', 'incompleto', 'frustrante', 'complicado', 'difícil', 'dificil'];

  let posCount = 0;
  let negCount = 0;

  for (const word of positiveWords) {
    if (lowercase.includes(word)) posCount++;
  }
  for (const word of negativeWords) {
    if (lowercase.includes(word)) negCount++;
  }

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

/**
 * Clasifica la categoría de un comentario (pregunta, sugerencia, problema, elogio, otro) por heurística.
 */
export function categorizeComment(text: string): 'pregunta' | 'sugerencia' | 'problema' | 'elogio' | 'otro' {
  const lowercase = text.toLowerCase();
  
  if (lowercase.includes('?') || lowercase.includes('como') || lowercase.includes('cómo') || lowercase.includes('que es') || lowercase.includes('qué es') || lowercase.includes('por que') || lowercase.includes('por qué') || lowercase.includes('explicar') || lowercase.includes('explicas')) {
    return 'pregunta';
  }
  if (lowercase.includes('sugiero') || lowercase.includes('deberias') || lowercase.includes('deberías') || lowercase.includes('haz un') || lowercase.includes('hacer un') || lowercase.includes('estaria bueno') || lowercase.includes('podrias') || lowercase.includes('podrías') || lowercase.includes('me gustaria') || lowercase.includes('me gustaría') || lowercase.includes('estaría bien') || lowercase.includes('estaria bien') || lowercase.includes('hablar de') || lowercase.includes('hace uno de')) {
    return 'sugerencia';
  }
  if (lowercase.includes('error') || lowercase.includes('fallo') || lowercase.includes('bug') || lowercase.includes('no funciona') || lowercase.includes('problema') || lowercase.includes('no compila') || lowercase.includes('roto') || lowercase.includes('fallando') || lowercase.includes('pantalla negra') || lowercase.includes('no me sale')) {
    return 'problema';
  }
  if (lowercase.includes('gracias') || lowercase.includes('excelente') || lowercase.includes('buen video') || lowercase.includes('crack') || lowercase.includes('buena explicación') || lowercase.includes('grande') || lowercase.includes('joya') || lowercase.includes('espectacular') || lowercase.includes('buenisimo') || lowercase.includes('buenísimo')) {
    return 'elogio';
  }
  return 'otro';
}
