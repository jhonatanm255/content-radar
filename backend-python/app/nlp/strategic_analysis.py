"""
Análisis estratégico profundo de comentarios de video.
Genera reportes ejecutivos con alertas, oportunidades y recomendaciones.
Usa métricas reales calculadas del backend — la IA solo interpreta, no inventa números.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Optional

import google.generativeai as genai

from app.config import get_settings
from app.nlp.gemini_analysis import has_gemini_key
from app.nlp.llm_enrichment import extract_topic_from_result

logger = logging.getLogger(__name__)

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover
    AsyncOpenAI = None  # type: ignore

PRIORITY_ENGAGEMENT = {
    "problem": 4,
    "criticism": 4,
    "suggestion": 3,
    "question": 3,
    "support": 2,
    "resonance": 1,
    "neutral": 0,
}


def _get_async_deepseek_client() -> Optional[AsyncOpenAI]:
    settings = get_settings()
    if settings.get("openai_api_key") and AsyncOpenAI:
        return AsyncOpenAI(
            api_key=settings["openai_api_key"],
            base_url="https://api.deepseek.com/v1"
        )
    return None


def _sample_comments_for_strategic(
    comments: list[dict],
    analysis_results: Optional[list[dict]] = None,
    max_samples: int = 120,
) -> list[dict]:
    if len(comments) <= max_samples:
        return comments

    results_by_id = {r.get("id"): r for r in (analysis_results or []) if r.get("id")}
    scored: list[tuple[int, int, dict]] = []

    for index, comment in enumerate(comments):
        result = results_by_id.get(comment["id"], {})
        engagement = result.get("engagement_type", "neutral")
        priority = PRIORITY_ENGAGEMENT.get(engagement, 0)
        scored.append((priority, index, comment))

    scored.sort(key=lambda item: (-item[0], item[1]))
    return [comment for _, _, comment in scored[:max_samples]]


def _build_real_metrics(analysis_results: list[dict]) -> dict:
    """
    Calcula métricas reales a partir de los resultados de análisis.
    Estas se inyectan en el prompt para que la IA no tenga que inventar números.
    """
    total = len(analysis_results) or 1
    sentiments: dict[str, int] = {}
    engagement_types: dict[str, int] = {}
    topics: dict[str, int] = {}

    for result in analysis_results:
        sentiment = result.get("sentiment", "neutral")
        sentiments[sentiment] = sentiments.get(sentiment, 0) + 1

        engagement = result.get("engagement_type", "neutral")
        engagement_types[engagement] = engagement_types.get(engagement, 0) + 1

        topic = extract_topic_from_result(result)
        if topic and topic not in ("general", "General", "otro", ""):
            topics[topic] = topics.get(topic, 0) + 1

    # Calcular porcentajes reales de sentimiento
    positive_pct = round((sentiments.get("positive", 0) / total) * 100)
    neutral_pct = round((sentiments.get("neutral", 0) / total) * 100)
    negative_pct = 100 - positive_pct - neutral_pct  # garantizar que sumen 100

    # Top temas por frecuencia
    top_topics = dict(sorted(topics.items(), key=lambda x: x[1], reverse=True)[:10])

    # Top engagement types
    top_engagement = dict(sorted(engagement_types.items(), key=lambda x: x[1], reverse=True))

    return {
        "total": total,
        "sentiment_positive_pct": positive_pct,
        "sentiment_neutral_pct": neutral_pct,
        "sentiment_negative_pct": negative_pct,
        "sentiment_raw": sentiments,
        "engagement_distribution": top_engagement,
        "top_topics": top_topics,
        "problem_count": engagement_types.get("problem", 0) + engagement_types.get("criticism", 0),
        "question_count": engagement_types.get("question", 0),
        "suggestion_count": engagement_types.get("suggestion", 0),
        "resonance_count": engagement_types.get("resonance", 0),
    }


def deduplicate_strategic_report(result: dict) -> dict:
    """Elimina información repetida entre secciones del reporte estratégico."""
    if not isinstance(result, dict) or result.get("status") != "success":
        return result

    # 1. Deduplicar actionable_alerts por similitud de título
    alerts = result.get("actionable_alerts", [])
    unique_alerts = []
    seen_alert_tokens = []
    for a in alerts:
        title = a.get("title", "").strip()
        norm_title = title.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        key_words = set(re.findall(r"\w+", norm_title)) - {
            "de", "la", "el", "los", "las", "en", "un", "una", "y", "o", "a", "por", "alerta", "con"
        }
        if not key_words:
            unique_alerts.append(a)
            continue

        is_dup = False
        for seen in seen_alert_tokens:
            overlap = len(key_words & seen)
            min_len = min(len(key_words), len(seen))
            if overlap >= 3 or (min_len > 0 and overlap / min_len >= 0.70):
                is_dup = True
                break
        if not is_dup:
            seen_alert_tokens.append(key_words)
            unique_alerts.append(a)

    result["actionable_alerts"] = unique_alerts

    # 2. Deduplicar content_opportunities por tema
    opps = result.get("content_opportunities", [])
    unique_opps = []
    seen_opp_tokens = []
    for o in opps:
        topic = o.get("topic", "").strip()
        norm_topic = topic.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        key_words = set(re.findall(r"\w+", norm_topic)) - {
            "de", "la", "el", "los", "las", "en", "un", "una", "y", "o", "a", "por", "video", "como", "tutorial", "sobre"
        }
        if not key_words:
            unique_opps.append(o)
            continue

        is_dup = False
        for seen in seen_opp_tokens:
            overlap = len(key_words & seen)
            min_len = min(len(key_words), len(seen))
            if overlap >= 2 or (min_len > 0 and overlap / min_len >= 0.70):
                is_dup = True
                break
        if not is_dup:
            seen_opp_tokens.append(key_words)
            unique_opps.append(o)

    result["content_opportunities"] = unique_opps

    # 3. Deduplicar strategic_recommendations (evitar repetición interna y con alert actions)
    alert_actions = [
        a.get("suggested_action", "").lower()
        for a in unique_alerts
        if a.get("suggested_action")
    ]
    recs = result.get("strategic_recommendations", [])
    unique_recs = []
    seen_rec_tokens = []

    for r in recs:
        if not isinstance(r, str) or not r.strip():
            continue
        clean_r = r.strip()
        norm_r = clean_r.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        # Si coincide sustancialmente con alguna acción sugerida de una alerta
        if any(norm_r in act or act in norm_r for act in alert_actions if len(act) > 20):
            continue

        words = set(re.findall(r"\w+", norm_r)) - {
            "de", "la", "el", "los", "las", "en", "un", "una", "y", "o", "a", "por", "para", "que", "hacer"
        }
        if not words:
            unique_recs.append(clean_r)
            continue

        is_dup = False
        for seen in seen_rec_tokens:
            overlap = len(words & seen)
            min_len = min(len(words), len(seen))
            if overlap >= 3 or (min_len > 0 and overlap / min_len >= 0.65):
                is_dup = True
                break

        if not is_dup:
            seen_rec_tokens.append(words)
            unique_recs.append(clean_r)

    result["strategic_recommendations"] = unique_recs[:5]
    return result


async def generate_strategic_report(
    comments: list[dict],
    video_title: str,
    channel_name: str,
    video_id: Optional[str] = None,
    analysis_results: Optional[list[dict]] = None,
    video_context: Optional[str] = None,
) -> dict:
    """
    Genera un reporte estratégico profundo del video.
    Inyecta métricas reales calculadas para que la IA no invente números.
    Soporta DeepSeek y Gemini con fallback automático.
    """
    if not comments:
        return {
            "status": "error",
            "message": "Empty comments",
        }

    client = _get_async_deepseek_client()
    has_gemini = has_gemini_key()
    if not client and not has_gemini:
        return {
            "status": "error",
            "message": "No AI client (DeepSeek or Gemini) configured",
        }

    try:
        sampled = _sample_comments_for_strategic(comments, analysis_results, max_samples=120)
        comments_text = "\n".join([
            f'- "{c["text"][:500]}"' for c in sampled
        ])

        # Calcular métricas reales para inyectar en el prompt
        real_metrics: dict = {}
        real_metrics_text = ""
        if analysis_results:
            real_metrics = _build_real_metrics(analysis_results)
            real_metrics_text = f"""
MÉTRICAS REALES CALCULADAS (USA ESTOS NÚMEROS EXACTOS — NO LOS INVENTES):
- Total comentarios analizados: {real_metrics['total']}
- Sentimiento positivo: {real_metrics['sentiment_positive_pct']}% ({real_metrics['sentiment_raw'].get('positive', 0)} comentarios)
- Sentimiento neutral: {real_metrics['sentiment_neutral_pct']}% ({real_metrics['sentiment_raw'].get('neutral', 0)} comentarios)
- Sentimiento negativo: {real_metrics['sentiment_negative_pct']}% ({real_metrics['sentiment_raw'].get('negative', 0)} comentarios)
- Distribución de engagement: {json.dumps(real_metrics['engagement_distribution'], ensure_ascii=False)}
- Temas más frecuentes (IA): {json.dumps(real_metrics['top_topics'], ensure_ascii=False)}
- Problemas/Críticas: {real_metrics['problem_count']} comentarios
- Preguntas: {real_metrics['question_count']} comentarios
- Sugerencias: {real_metrics['suggestion_count']} comentarios
- Ecos del hook (resonancia): {real_metrics['resonance_count']} comentarios
"""

        context_block = ""
        if video_context:
            context_block = f"""
CONTEXTO DEL VIDEO:
{video_context[:3500]}
"""

        prompt = f"""INSTRUCCIONES: Eres un analista estratégico experto en comunidades de YouTube.

DATOS DEL VIDEO:
- Canal: {channel_name}
- Título: {video_title}
- Video ID: {video_id or 'N/A'}
- Total de comentarios: {len(comments)}
- Muestra representativa analizada: {len(sampled)} comentarios (priorizados por relevancia)
{context_block}
{real_metrics_text}
COMENTARIOS PARA ANALIZAR (muestra priorizada por relevancia):
{comments_text}

TAREA: Genera un REPORTE EJECUTIVO ESTRATÉGICO completo.

REGLAS CRÍTICAS DE NO-DUPLICIDAD:
1. **USA LOS PORCENTAJES REALES PROVISTOS ARRIBA** — NO calcules ni estimes sentimientos, ya están calculados.
2. **NO REPITAS NINGÚN DATO O CONCEPTO ENTRE LAS DIFERENTES SECCIONES**. Cada sección aporta información ÚNICA.
3. El "summary" es una lectura narrativa del estado de la comunidad — NO repite datos numéricos del sentiment_analysis ni copia títulos de alertas.
4. Las "actionable_alerts" deben ser únicas entre sí y no repetir lo que ya está en "summary".
5. Las "content_opportunities" son ideas de contenido NUEVAS para futuros videos, no refritos de las alertas técnicas.
6. Las "strategic_recommendations" son pasos de acción metodológicos para el creador, únicos y no repetidos en las alertas.

SECCIONES DEL REPORTE:

1. **RESUMEN GENERAL**: Tono general, patrones culturales/humor, valor percibido del video. SIN números de sentimiento.

2. **ANÁLISIS DE SENTIMIENTOS**: Usa los porcentajes reales provistos. Añade matices cualitativos: ¿hay humor en críticas? ¿sarcasmo? ¿apoyo irónico?

3. **MÉTRICAS DE ENGAGEMENT**: Nivel de participación, patrón de consumo (fondo, escucha atenta, etc.), lealtad, potencial viral.

4. **ALERTAS ACCIONABLES**: SOLO alertas que NO hayan sido mencionadas en el resumen. Usa severidad:
   - ROJA: Riesgo inmediato (críticas técnicas, problemas que bloquean a la audiencia)
   - AMARILLA: Fricción potencial o demanda no atendida
   - VERDE: Oportunidad aprovechable de bajo riesgo
   Cada alerta incluye "suggested_action" específico y concreto.

5. **OPORTUNIDADES DE CONTENIDO**: Ideas de videos futuros sugeridas IMPLÍCITA O EXPLÍCITAMENTE por la audiencia.

6. **RECOMENDACIONES ESTRATÉGICAS**: Máximo 5 acciones únicas para el creador.

7. **PRÓXIMOS PASOS**: Plan concreto para las próximas 2 semanas.

FORMATO DE RESPUESTA: JSON válido con esta estructura:
{{
    "summary": "resumen narrativo (2-3 párrafos SIN porcentajes de sentimiento)",
    "sentiment_analysis": {{
        "positive_percent": {real_metrics.get('sentiment_positive_pct', 0) if real_metrics else 0},
        "neutral_percent": {real_metrics.get('sentiment_neutral_pct', 0) if real_metrics else 0},
        "negative_percent": {real_metrics.get('sentiment_negative_pct', 0) if real_metrics else 0},
        "nuances": "análisis cualitativo de matices (humor, sarcasmo, ironía, etc.)"
    }},
    "engagement_metrics": {{
        "participation_level": "baja|media|alta",
        "consumption_pattern": "cómo consume la audiencia este tipo de contenido",
        "community_loyalty": "análisis de lealtad y recurrencia de la comunidad",
        "viral_potential": "evaluación del potencial de difusión"
    }},
    "actionable_alerts": [
        {{
            "severity": "ROJA|AMARILLA|VERDE",
            "title": "título único, no repetido en summary",
            "description": "descripción con datos específicos de los comentarios",
            "suggested_action": "acción concreta y específica para el creador"
        }}
    ],
    "content_opportunities": [
        {{
            "topic": "tema canónico en español",
            "source": "direct|implicit",
            "description": "por qué este tema tiene potencial y cómo abordarlo",
            "priority": "high|medium|low"
        }}
    ],
    "strategic_recommendations": [
        "recomendación 1 única y accionable",
        "recomendación 2 única y accionable"
    ],
    "next_steps": "plan concreto: qué publicar, qué responder y qué evitar en las próximas 2 semanas"
}}

RESPONDE SOLO EL JSON ANTERIOR. SIN PREFACIO NI EXPLICACIONES.
"""

        logger.info(f"Generando análisis estratégico para {video_title}...")
        text = ""

        if client:
            try:
                response = await client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {
                            "role": "system",
                            "content": "Eres un analista estratégico experto en comunidades digitales y creadores de contenido. Proporcionas insights profundos, contextuales y accionables, sintetizando la información sin repetir conceptos. Los porcentajes de sentimiento que recibes son DATOS REALES calculados — úsalos tal cual. Responde SOLO JSON válido."
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.35,
                    max_tokens=4500,
                )
                text = response.choices[0].message.content.strip()
            except Exception as exc:
                logger.warning(f"Error generando reporte con DeepSeek: {exc}. Intentando fallback...")

        if not text and has_gemini:
            try:
                logger.info(f"Generando análisis estratégico con Gemini para {video_title}...")
                model = genai.GenerativeModel("gemini-2.5-flash")
                system_instruction = (
                    "Eres un analista estratégico experto en comunidades digitales y creadores de contenido. "
                    "Proporcionas insights profundos, contextuales y accionables, sintetizando la información sin repetir conceptos. "
                    "Los porcentajes de sentimiento que recibes son DATOS REALES calculados — úsalos tal cual. Responde SOLO JSON válido."
                )
                full_gemini_prompt = f"{system_instruction}\n\n{prompt}"
                gemini_resp = await asyncio.to_thread(
                    model.generate_content,
                    full_gemini_prompt,
                    generation_config={"temperature": 0.35}
                )
                text = gemini_resp.text.strip()
            except Exception as exc:
                logger.error(f"Error generando reporte con Gemini: {exc}")

        if not text:
            return {
                "status": "error",
                "message": "No se obtuvo respuesta de ningún motor de IA (DeepSeek / Gemini)",
            }

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        result["status"] = "success"
        result["video_title"] = video_title
        result["channel_name"] = channel_name
        result["total_comments"] = len(comments)

        # Asegurar que los porcentajes de sentimiento en el resultado son los reales
        if real_metrics and result.get("sentiment_analysis"):
            result["sentiment_analysis"]["positive_percent"] = real_metrics["sentiment_positive_pct"]
            result["sentiment_analysis"]["neutral_percent"] = real_metrics["sentiment_neutral_pct"]
            result["sentiment_analysis"]["negative_percent"] = real_metrics["sentiment_negative_pct"]

        # Aplicar deduplicación semántica para eliminar redundancias
        result = deduplicate_strategic_report(result)

        logger.info(f"✓ Análisis estratégico completado y deduplicado para {video_title}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Error decodificando JSON del análisis estratégico: {str(e)}")
        return {
            "status": "error",
            "message": f"JSON decode error: {str(e)}",
            "raw_response": text[:500] if 'text' in locals() else None,
        }
    except Exception as e:
        logger.error(f"Error generando análisis estratégico: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
        }
