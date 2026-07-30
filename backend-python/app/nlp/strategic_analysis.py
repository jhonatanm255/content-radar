"""
Análisis estratégico profundo de comentarios de video.
Genera reportes ejecutivos con alertas, oportunidades y recomendaciones.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from app.config import get_settings
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
    max_samples: int = 80,
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
    """
    client = _get_async_deepseek_client()
    if not client or not comments:
        return {
            "status": "error",
            "message": "No DeepSeek client or empty comments",
        }

    try:
        sampled = _sample_comments_for_strategic(comments, analysis_results, max_samples=80)
        comments_text = "\n".join([
            f'- "{c["text"][:500]}"' for c in sampled
        ])

        basic_analysis_text = ""
        if analysis_results:
            sentiments: dict[str, int] = {}
            engagement_types: dict[str, int] = {}
            topics: dict[str, int] = {}

            for result in analysis_results:
                sentiment = result.get("sentiment", "neutral")
                sentiments[sentiment] = sentiments.get(sentiment, 0) + 1

                engagement = result.get("engagement_type", "neutral")
                engagement_types[engagement] = engagement_types.get(engagement, 0) + 1

                topic = extract_topic_from_result(result)
                if topic and topic != "general":
                    topics[topic] = topics.get(topic, 0) + 1

            basic_analysis_text = f"""
Análisis agregado de todos los comentarios ({len(analysis_results)} total):
- Sentimientos: {json.dumps(sentiments)}
- Tipos de engagement: {json.dumps(engagement_types)}
- Temas principales (IA): {json.dumps(dict(sorted(topics.items(), key=lambda x: x[1], reverse=True)[:8]))}
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
- Muestra representativa analizada: {len(sampled)} comentarios
{context_block}
COMENTARIOS PARA ANALIZAR (muestra priorizada por relevancia):
{comments_text}
{basic_analysis_text}

TAREA: Genera un REPORTE EJECUTIVO ESTRATÉGICO completo con:

1. **RESUMEN GENERAL DEL FEEDBACK**
   - Tono general de la comunidad
   - Temas recurrentes (memes, patrones, insights)
   - Valor percibido del video

2. **ANÁLISIS DE SENTIMIENTOS**
   - Distribución Positivo/Neutral/Negativo (%)
   - Matices: ¿hay humor en críticas? ¿apoyo irónico? ¿sarcasmo?
   - Tono dominante de la interacción

3. **MÉTRICAS CLAVE DE ENGAGEMENT**
   - Ratio de participación (baja/media/alta)
   - Patrones de consumo (fondo, escucha atenta, etc.)
   - Indicadores de lealtad de la comunidad
   - Viralidad potencial

4. **ALERTAS ACCIONABLES** (Prioriza como ROJA/AMARILLA/VERDE)
   - ROJA: Riesgos inmediatos o problemas críticos
   - AMARILLA: Problemas potenciales o demandas claras
   - VERDE: Oportunidades aprovechables
   Cada alerta debe incluir "Acción sugerida"

5. **OPORTUNIDADES DE CONTENIDO**
   - Temas específicos sugeridos por la comunidad
   - Ideas implícitas de videos futuros
   - Colaboraciones potenciales
   - Formatos que funcionan

6. **RECOMENDACIONES ESTRATÉGICAS**
   - Próximos pasos para mantener engagement
   - Cómo responder a la comunidad
   - Evolución sugerida del contenido

FORMATO DE RESPUESTA: JSON válido con esta estructura:
{{
    "summary": "resumen general (2-3 párrafos)",
    "sentiment_analysis": {{
        "positive_percent": número,
        "neutral_percent": número,
        "negative_percent": número,
        "nuances": "análisis de matices y contexto"
    }},
    "engagement_metrics": {{
        "participation_level": "baja|media|alta",
        "consumption_pattern": "string",
        "community_loyalty": "string",
        "viral_potential": "string"
    }},
    "actionable_alerts": [
        {{
            "severity": "ROJA|AMARILLA|VERDE",
            "title": "string",
            "description": "string",
            "suggested_action": "string"
        }}
    ],
    "content_opportunities": [
        {{
            "topic": "string",
            "source": "direct|implicit",
            "description": "string",
            "priority": "high|medium|low"
        }}
    ],
    "strategic_recommendations": [
        "recomendación 1",
        "recomendación 2"
    ],
    "next_steps": "acciones concretas para las próximas 2 semanas"
}}

RESPONDE SOLO EL JSON ANTERIOR. SIN PREFACIO NI EXPLICACIONES.
SÉ DETALLADO, CONTEXTUAL Y PROPORCIONA INSIGHTS ACCIONABLES.
"""

        logger.info(f"Generando análisis estratégico para {video_title}...")

        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un analista estratégico experto en comunidades digitales y creadores de contenido. Proporcionas insights profundos, contextuales y accionables. Responde SOLO JSON válido."
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=4000,
        )

        text = response.choices[0].message.content.strip()

        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        result["status"] = "success"
        result["video_title"] = video_title
        result["channel_name"] = channel_name
        result["total_comments"] = len(comments)

        logger.info(f"✓ Análisis estratégico completado para {video_title}")
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
