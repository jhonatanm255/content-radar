from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.analytics.demographics import fetch_demographics
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

app = FastAPI(
    title="Content Radar - Processing Service",
    description="Servicio Python: NLP, OAuth YouTube Analytics y demografía de canal",
    version="1.2.0",
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings["frontend_url"], "http://localhost:5173", "http://127.0.0.1:5173"],
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


class CommentAnalysisRequest(BaseModel):
    comments: List[CommentInput]
    video_title: Optional[str] = None


class CommentAnalysisResponse(BaseModel):
    results: List[CommentAnalysisResult]
    engine: str
    count: int


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

    payload = [{"id": c.id, "text": c.text} for c in body.comments]
    results, engine = analyze_comments_batch(payload, video_title=body.video_title)

    return CommentAnalysisResponse(
        results=[CommentAnalysisResult(**r) for r in results],
        engine=engine,
        count=len(results),
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
