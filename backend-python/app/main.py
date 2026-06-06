from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

app = FastAPI(
    title="Content Radar - Processing Service",
    description="Servicio Python de análisis de sentimiento y modelado de temas para comentarios de YouTube",
    version="1.0.0"
)

class CommentInput(BaseModel):
    id: str
    text: str

class SentimentResponse(BaseModel):
    id: str
    sentiment: str # 'positive', 'neutral', 'negative'

class TextListInput(BaseModel):
    texts: List[str]

class TopicResponse(BaseModel):
    topic: str
    count: int
    growth: float

@app.get("/")
def read_root():
    return {"status": "online", "service": "Content Radar Python Backend"}

@app.post("/analyze-sentiment", response_model=List[SentimentResponse])
def analyze_sentiment(comments: List[CommentInput]):
    """
    Analiza el sentimiento de una lista de comentarios de YouTube.
    En producción, aquí se cargaría un modelo de HuggingFace Transformer (como RoBERTa-sentimiento).
    """
    results = []
    for c in comments:
        text_lower = c.text.lower()
        # Heurística simple
        if any(word in text_lower for word in ["excelente", "bueno", "gracias", "genial", "crack"]):
            sentiment = "positive"
        elif any(word in text_lower for word in ["malo", "error", "fallo", "no funciona", "problema"]):
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        results.append(SentimentResponse(id=c.id, sentiment=sentiment))
    return results

@app.post("/extract-topics", response_model=List[TopicResponse])
def extract_topics(input_data: TextListInput):
    """
    Extrae temas principales usando procesamiento de lenguaje natural (NLP).
    En producción, aquí se usaría BERTopic, LDA o TF-IDF.
    """
    # Simulación de extracción de tópicos de desarrollo
    topics_mock = [
        {"topic": "Coolify", "count": 1243, "growth": 34.0},
        {"topic": "VPS", "count": 876, "growth": 12.0},
        {"topic": "Docker", "count": 754, "growth": 18.0},
        {"topic": "Kubernetes", "count": 320, "growth": 22.0},
        {"topic": "IA Local", "count": 140, "growth": 85.0}
    ]
    return [TopicResponse(**t) for t in topics_mock]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
