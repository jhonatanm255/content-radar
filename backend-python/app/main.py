from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.analytics.demographics import fetch_demographics
from app.analytics.video_engagement import fetch_video_engagement
from app.auth.supabase_auth import get_user_id_from_token
from app.auth.youtube_oauth import (
    build_auth_url,
    disconnect,
    get_connection_status,
    handle_callback,
    oauth_configured,
)
from app.config import get_settings
from app.nlp.analyze import analyze_comments_batch
from app.nlp.sentiment import analyze_sentiment_batch, get_sentiment_engine_name
from app.nlp.youtube_context import extract_video_id, get_video_context, get_youtube_transcript, generate_video_summary
from app.nlp.strategic_analysis import generate_strategic_report

app = FastAPI(
    title="Content Radar - Processing Service",
    description="Servicio Python: NLP, OAuth YouTube Analytics y demografía de canal",
    version="1.2.0",
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings["frontend_url"],
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommentInput(BaseModel):
    id: str
    text: str


class SentimentResponse(BaseModel):
    id: str
    sentiment: str


class TextListInput(BaseModel):
    texts: List[str]


class TopicResponse(BaseModel):
    topic: str
    count: int
    growth: float


class CommentAnalysisResult(BaseModel):
    id: str
    sentiment: str
    sentiment_confidence: float
    category: str
    content_sentiment: str
    engagement_type: str
    is_resonance: bool = False
    topic: Optional[str] = None
    # Campos opcionales de enriquecimiento (Gemini/Ollama)
    sentiment_ollama: Optional[str] = None
    engagement_type_ollama: Optional[str] = None
    topic_ollama: Optional[str] = None
    relevance_ollama: Optional[str] = None
    intent_ollama: Optional[str] = None
    key_phrase: Optional[str] = None

    class Config:
        extra = "allow"


class CommentAnalysisRequest(BaseModel):
    comments: List[CommentInput]
    video_title: Optional[str] = None
    video_context: Optional[str] = None  # Resumen/contexto del video
    video_id: Optional[str] = None  # Para extraer contexto automáticamente
    video_url: Optional[str] = None
    channel_name: Optional[str] = None  # Nombre del canal de YouTube


class CommentAnalysisResponse(BaseModel):
    results: List[CommentAnalysisResult]
    engine: str
    count: int
    alerts: Optional[List[str]] = None
    short_requests: Optional[List[dict]] = None
    analysis_report: Optional[str] = None
    strategic_report: Optional[dict] = None  # Nuevo: reporte estratégico profundo


class VideoContextResponse(BaseModel):
    transcript: Optional[str] = None
    summary: Optional[str] = None
    full_context: str


class VideoSummaryRequest(BaseModel):
    video_id: str
    video_title: Optional[str] = None


@app.get("/nlp/status")
def nlp_status():
    return {
        "sentiment_engine": get_sentiment_engine_name(),
        "ready": True,
    }


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Content Radar Python Backend",
        "oauth_configured": oauth_configured(),
    }


@app.get("/auth/youtube/status")
async def youtube_auth_status(authorization: Optional[str] = Header(default=None)):
    user_id = await get_user_id_from_token(authorization)
    return get_connection_status(user_id)


@app.get("/auth/youtube/start")
async def youtube_auth_start(authorization: Optional[str] = Header(default=None)):
    user_id = await get_user_id_from_token(authorization)
    return {"auth_url": build_auth_url(user_id)}


@app.get("/auth/youtube/callback")
async def youtube_auth_callback(
    code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None
):
    frontend = settings["frontend_url"]

    if error:
        return RedirectResponse(f"{frontend}/settings?youtube_error={error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Parámetros OAuth incompletos")

    await handle_callback(code, state)
    return RedirectResponse(f"{frontend}/settings?youtube_connected=1")


@app.delete("/auth/youtube/disconnect")
async def youtube_auth_disconnect(authorization: Optional[str] = Header(default=None)):
    user_id = await get_user_id_from_token(authorization)
    disconnect(user_id)
    return {"success": True}


@app.get("/analytics/demographics")
async def analytics_demographics(
    authorization: Optional[str] = Header(default=None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    user_id = await get_user_id_from_token(authorization)
    return fetch_demographics(user_id, start_date, end_date)


@app.get("/analytics/video-engagement")
async def analytics_video_engagement(
    authorization: Optional[str] = Header(default=None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    user_id = await get_user_id_from_token(authorization)
    return fetch_video_engagement(user_id, start_date, end_date)


@app.post("/analyze/comments", response_model=CommentAnalysisResponse)
async def analyze_comments(
    body: CommentAnalysisRequest,
    authorization: Optional[str] = Header(default=None),
):
    await get_user_id_from_token(authorization)

    if not body.comments:
        return CommentAnalysisResponse(results=[], engine="none", count=0)

    if len(body.comments) > 5000:
        raise HTTPException(status_code=400, detail="Máximo 5000 comentarios por solicitud.")

    # Si video_id o video_url están presentes, extraer contexto automáticamente
    video_id = body.video_id
    if not video_id and body.video_url:
        video_id = extract_video_id(body.video_url)

    video_context = body.video_context
    if video_id and not video_context:
        try:
            context_data = get_video_context(
                video_id,
                body.video_title,
                use_transcript=True,
                use_summary=True,
            )
            video_context = context_data.get("full_context")
        except Exception as e:
            import logging
            logging.error(f"Error extrayendo contexto de video: {str(e)}")
            # Continuar sin contexto si falla

    payload = [{"id": c.id, "text": c.text} for c in body.comments]
    results, engine, alerts, short_requests, analysis_report = analyze_comments_batch(
        payload,
        video_title=body.video_title,
        video_context=video_context,
    )

    # Generar análisis estratégico profundo
    strategic_report = None
    try:
        strategic_report = generate_strategic_report(
            comments=payload,
            video_title=body.video_title or "Video sin título",
            channel_name=body.channel_name or "Content Radar User",
            video_id=video_id,
            analysis_results=results,
            video_context=video_context,
        )
    except Exception as e:
        import logging
        logging.warning(f"Error generando análisis estratégico: {str(e)}")
        # Continuar sin análisis estratégico si falla

    return CommentAnalysisResponse(
        results=[CommentAnalysisResult(**r) for r in results],
        engine=engine,
        count=len(results),
        alerts=alerts,
        short_requests=short_requests,
        analysis_report=analysis_report,
        strategic_report=strategic_report,
    )


@app.post("/analyze/video-context", response_model=VideoContextResponse)
async def analyze_video_context(
    body: VideoSummaryRequest,
    authorization: Optional[str] = Header(default=None),
):
    """
    Extrae transcripción y resumen de un video de YouTube.
    """
    await get_user_id_from_token(authorization)

    try:
        context_data = get_video_context(
            body.video_id,
            body.video_title,
            use_transcript=True,
            use_summary=True,
        )
        return VideoContextResponse(**context_data)
    except Exception as e:
        import logging
        logging.error(f"Error extrayendo contexto de video: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error extrayendo contexto: {str(e)}"
        )


@app.get("/analyze/video-summary/{video_id}", response_model=VideoContextResponse)
async def get_video_summary(
    video_id: str,
    video_title: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    """
    Obtiene el resumen de un video específico.
    """
    await get_user_id_from_token(authorization)

    try:
        context_data = get_video_context(
            video_id,
            video_title,
            use_transcript=True,
            use_summary=True,
        )
        return VideoContextResponse(**context_data)
    except Exception as e:
        import logging
        logging.error(f"Error obteniendo resumen del video: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error obteniendo resumen: {str(e)}"
        )


@app.post("/analyze-sentiment", response_model=List[SentimentResponse])
def analyze_sentiment(comments: List[CommentInput]):
    texts = [c.text for c in comments]
    sentiments = analyze_sentiment_batch(texts)
    return [
        SentimentResponse(id=c.id, sentiment=s[0])
        for c, s in zip(comments, sentiments)
    ]


@app.post("/extract-topics", response_model=List[TopicResponse])
def extract_topics(input_data: TextListInput):
    topics_mock = [
        {"topic": "Coolify", "count": 1243, "growth": 34.0},
        {"topic": "VPS", "count": 876, "growth": 12.0},
        {"topic": "Docker", "count": 754, "growth": 18.0},
        {"topic": "Kubernetes", "count": 320, "growth": 22.0},
        {"topic": "IA Local", "count": 140, "growth": 85.0},
    ]
    return [TopicResponse(**t) for t in topics_mock]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
