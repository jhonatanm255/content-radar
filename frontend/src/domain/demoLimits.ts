/**
 * Configuración y utilidades del modo demo.
 *
 * En la versión demo cada cuenta puede analizar hasta DEMO_MAX_ANALYZED_VIDEOS
 * videos en total (global, sin importar cuántos canales tenga).
 */

/** Máximo de videos que una cuenta demo puede analizar */
export const DEMO_MAX_ANALYZED_VIDEOS = 3;

/** Mensaje que se muestra cuando se alcanza el límite */
export const DEMO_LIMIT_MESSAGE =
  'Has alcanzado el límite de 3 videos analizados en la versión demo. ¡Gracias por tu feedback! Contacta al equipo de Content Radar para acceder a la versión completa.';

/** Calcula cuántos slots de análisis le quedan al usuario */
export function getDemoRemainingSlots(analyzedCount: number): number {
  return Math.max(0, DEMO_MAX_ANALYZED_VIDEOS - analyzedCount);
}

/** Retorna `true` si se alcanzó el límite demo */
export function isDemoLimitReached(analyzedCount: number): boolean {
  return analyzedCount >= DEMO_MAX_ANALYZED_VIDEOS;
}
