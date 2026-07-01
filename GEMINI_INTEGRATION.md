# Sistema de Análisis Contextual con Ollama

## ⚡ Cambio: Ahora usa Ollama en lugar de Gemini

Se ha reemplazado Google Gemini con **Ollama** para análisis contextual local:
- ✅ **Gratis**: Sin límites de API ni costos
- ✅ **Local**: Ejecuta en tu máquina, cero latencia
- ✅ **Privado**: Tus datos nunca salen del servidor
- ✅ **Sin Rate Limits**: Analiza comentarios sin restricciones

## Cambios Implementados

### Backend Python
Se han añadido nuevos módulos y endpoints para análisis contextual de comentarios usando Gemini API:

#### Nuevos Módulos:
1. **`app/nlp/youtube_context.py`** - Extracción de transcripciones y generación de resúmenes
   - `get_youtube_transcript()` - Extrae la transcripción de un video
   - `generate_video_summary()` - Genera resumen usando Gemini
   - `get_video_context()` - Combina ambos

2. **`app/nlp/ollama_analysis.py`** - Análisis contextual con Ollama (LOCAL)
   - `analyze_comment_with_context()` - Analiza un comentario con contexto
   - `batch_analyze_with_context()` - Analiza múltiples comentarios en lotes
   - `refine_analysis()` - Fusiona análisis de heurísticas con Ollama

#### Cambios en módulos existentes:
- **`app/nlp/analyze.py`** - Ahora importa `ollama_analysis` en lugar de `gemini_analysis`
- **`app/main.py`** - Nuevos endpoints y modelos Pydantic

#### Nuevos Endpoints:

1. **POST `/analyze/comments`** - Análisis mejorado
   - **Request**:
     ```json
     {
       "comments": [
         {"id": "c1", "text": "comentario 1"},
         {"id": "c2", "text": "comentario 2"}
       ],
       "video_title": "Título del video",
       "video_context": "Resumen del video (opcional)",
       "video_id": "dQw4w9WgXcQ (opcional - si se incluye, extrae contexto automáticamente)"
     }
     ```
   - **Novedad**: Si incluyes `video_id`, el sistema extrae automáticamente la transcripción y genera un resumen

2. **POST `/analyze/video-context`** - Extrae contexto de video
   - **Request**:
     ```json
     {
       "video_id": "dQw4w9WgXcQ",
       "video_title": "Título del video (opcional)"
     }
     ```
   - **Response**:
     ```json
     {
       "transcript": "...",
       "summary": "...",
       "full_context": "..."
     }
     ```

3. **GET `/analyze/video-summary/{video_id}`** - Obtiene resumen de un video
   - Query params: `video_title` (opcional)
   - Retorna `VideoContextResponse`

## Configuración

### 1. Instalar y ejecutar Ollama

Verifica que Ollama esté corriendo en tu máquina:

```bash
# Terminal 1: Iniciar Ollama (si no está en background)
ollama serve

# Terminal 2: En tu proyecto, verifica la conexión
python -c "from ollama import Client; c = Client(); print(c.generate('mistral', 'Hola'))"
```

**URL de Ollama**: `http://localhost:11434`

### 2. Dependencias Instaladas

Se han añadido a `requirements.txt`:
- `ollama>=0.1.0` - Para conectar con Ollama local

Retiradas:
- ❌ `google-generativeai>=0.3.0` (ya no necesario)

### 3. Variables de entorno

Ya **NO necesitas** `GEMINI_API_KEY`. El archivo `.env` puede estar vacío o sin esa variable.

## Flujo de Análisis Mejorado
Ollama → Resultados Mejorados
```

### Opción 3: Análisis automático con video_id
```
Video ID → Extraer Transcripción → Generar Resumen → 
Comentarios + Contexto → Pysentimiento + Heurísticas + Ollama
```
Comentarios + Video Context → Pysentimiento + Heurísticas + Gemini → Resultados Mejorados
```

### Opción 3: Análisis automático con video_id
```
Video ID → Extraer Transcripción → Generar Resumen → 
Comentarios + Contexto → Pysentimiento + Heurísticas + Gemini → Resultados Mejorados
```

## Cambios en Estructura de Respuesta

Los comentarios ahora pueden incluir:

### Análisis Base (siempre presente)
```json
{
  "id": "c1",
  "sentiment": "positive",
  "sentiment_confidence": 0.95,
  "category": "elogio",
  "content_sentiment": "positive",
  "engagement_type": "support",
  "is_resonance": false
}
```

### Campos Añadidos con Ollama (si video_context está disponible)
```json
{
  "sentiment_ollama": "positive",
  "engagement_type_ollama": "support",
  "topic_ollama": "calidad de edición",
  "relevance_ollama": "high",
  "intent_ollama": "elogio genuino",
  "key_phrase": "edición está impecable"
}
```

## Uso Recomendado en Frontend

### Flujo típico:
1. Usuario selecciona un video para analizar
2. Frontend obtiene los comentarios del video
3. **Opción A**: Enviar directamente a `/analyze/comments` con `video_id`
   - El backend extrae transcripción y resumen automáticamente
4. **Opción B**: Extraer contexto primero con `/analyze/video-context`
   - Luego enviar comentarios con el `video_context` en el request

### Ejemplo de Request Mejorado:
```typescript
// Opción A: Automático
const response = await fetch('http://localhost:8000/analyze/comments', {
  method: 'POST',
  body: JSON.stringify({
    comments: [
      { id: 'c1', text: 'Muy buen video!' },
      { id: 'c2', text: '¿Cuándo será el próximo capítulo?' }
    ],
    video_title: 'Mi Primer Video',
    video_id: 'dQw4w9WgXcQ'  // Extrae automáticamente
  })
});

// Opción B: Manual (si necesitas reutilizar el resumen)
const contextResponse = await fetch('http://localhost:8000/analyze/video-context', {
  method: 'POST',
  body: JSON.stringify({
    video_id: 'dQw4w9WgXcQ',
    video_title: 'Mi Primer Video'
  })
});

const { full_context } = await contextResponse.json();

const analysisResponse = await fetch('http://localhost:8000/analyze/comments', {
  method: 'POST',
  body: JSON.stringify({
    comments: [...],
    video_title: 'Mi Primer Video',
    video_context: full_context  // Reutilizar el contexto
  })Sin limites de tasa**: Ollama local no tiene rate limits
- **Tiempo de procesamiento**: 
  - Extracción de transcripción: 2-5 segundos
  - Generación de resumen: 3-10 segundos
  - Análisis con Ollama: 10-30 segundos según cantidad (más lento que Gemini pero gratis y local)

- El análisis es **backward-compatible**: si no envías `video_context` o `video_id`, funciona como antes
- Los endpoints nuevos requieren **autenticación** (authorization header)
- **Rate limits**: Gemini tiene límites de tasa de llamadas (por defecto 60 RPM en tier gratuito)
- **Tiempo de procesamiento**: 
  - Extracción de transcripción: 2-5 segundos
  - Generación de resumen: 3-10 segundos
  - Análisis con Gemini: 5-20 segundos según cantidad de comentarios

## Próximos Pasos (Frontend)

1. Actualizar `PythonInsightsClient` para usar nuevos endpoints
2. Añadir UI para:
   - MostrarError analizando comentario con Ollama"
- Verifica que Ollama esté corriendo: `ollama serve`
- Verifica la conexión: `curl http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"Hola"}'`
- Reinicia Ollama si es necesario

### Error: "Model mistral not found"
- Descarga el modelo: `ollama pull mistral`

### Ollama está lento
- Es normal en CPU. Para más velocidad, usa GPU (NVIDIA CUDA, Apple Metal)
- Cambia a un modelo más pequeño: `ollama pull neural-chat` (4.7GB, más rápido)
### Error: "Transcripciones deshabilitadas"
- El video no tiene subtítulos/transcripción disponible
- El análisis continuará con heurísticas básicas

### Error en análisis con Gemini
- El sistema fallback a análisis heurístico
- Revisa los logs para más detalles
- Verifica límite de rate limit de Gemini API
