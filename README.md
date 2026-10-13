# Content Radar 🎯 - Documentación Técnica Completa

**Content Radar** es una plataforma integral de Inteligencia Artificial diseñada para Creadores de Contenido en YouTube. Su objetivo principal es extraer, procesar y analizar miles de comentarios cruzándolos con el contexto real del video (transcripciones) para entregar *insights* estratégicos, oportunidades de contenido y alertas de comunidad.

Este documento es la **Guía Maestra de Onboarding** para desarrolladores. Contiene todos los detalles técnicos, decisiones de arquitectura, flujos de datos y límites operativos.

---

## 🏗️ 1. Arquitectura General del Sistema

El sistema sigue una arquitectura cliente-servidor completamente desacoplada:

- **Frontend:** Single Page Application (SPA) construida en React + TypeScript + Vite. Se encarga de la interfaz de usuario, la extracción primaria de datos desde YouTube y la orquestación del almacenamiento de los resultados en la base de datos.
- **Backend:** API REST en Python (FastAPI). Funciona como un motor de Procesamiento de Lenguaje Natural (NLP) y de Modelos de Lenguaje Grandes (LLM). Recibe texto bruto, lo procesa asíncronamente y devuelve métricas e *insights*.
- **Base de Datos:** PostgreSQL administrada a través de Supabase, que actúa como fuente de la verdad para persistir los reportes y comentarios procesados.

### Diagrama de Flujo de Análisis
1. **Frontend** consulta la API de YouTube para paginar hasta 10,000 comentarios de un video.
2. **Frontend** envía esos comentarios en lotes al **Backend** a través de un Background Job.
3. **Backend** obtiene la transcripción del video y genera un resumen (Contexto).
4. **Backend** procesa los comentarios (Sentimiento, Deduplicación, Análisis LLM, Resonancia).
5. **Frontend** solicita el estado del Job hasta que se completa.
6. **Frontend** consolida los resultados y los envía a **Supabase** usando comandos `upsert`.

---

## 📂 2. Estructura del Repositorio

El monorepo contiene los siguientes módulos principales:

```text
content-radar/
├── frontend/               # Aplicación web principal (React/Vite/Tailwind v4)
│   ├── src/
│   │   ├── application/    # Casos de uso (Orquestación del análisis, limits)
│   │   ├── domain/         # Entidades de negocio, heurísticas y cálculos (ej. commentAnalysis.ts)
│   │   ├── infrastructure/ # APIs externas (YouTube), Repositorios (Supabase)
│   │   └── presentation/   # Componentes UI, Páginas, Store Global (Zustand)
├── backend-python/         # Motor de Inteligencia Artificial (FastAPI)
│   ├── app/
│   │   ├── analytics/      # Estadísticas y métricas generales del canal
│   │   ├── auth/           # OAuth2 integrado con YouTube
│   │   ├── db/             # Manejo de Jobs asíncronos en memoria
│   │   ├── nlp/            # MÓDULO CORE: Pipelines de procesamiento de lenguaje
│   │   └── main.py         # Declaración de endpoints FastAPI
└── landing/                # Proyecto independiente para la Landing Page (Vite/React/Tailwind)
```

---

## 🖥️ 3. Frontend: Deep Dive

### Stack Tecnológico
- **Core:** React 18, TypeScript, Vite.
- **Estilado:** Tailwind CSS v4 (Light/Dark themes), Lucide React (íconos).
- **Animaciones:** Framer Motion (Transiciones, Scroll reveals).
- **Gestión de Estado:** Zustand (en `appStore.ts`).
- **Gráficos:** Recharts.
- **Cliente BD:** `@supabase/supabase-js`.

### Paginación Profunda de YouTube (Bypass del Límite)
Por defecto, si se solicita a la YouTube Data API v3 (`commentThreads.list`) ordenar por `relevance`, **YouTube impone un límite estricto de ~1,000 comentarios**, independientemente de la paginación. 
Para extraer el catálogo completo (ej. 5,000+ comentarios):
- El archivo `YoutubeApiClient.ts` fuerza el parámetro `order='time'`.
- Realiza llamadas en un ciclo `while` gestionando el `nextPageToken`.
- **Diferenciación de nivel:** Separa los comentarios top-level de las `replies` para no consumir prematuramente la cuota solicitada de la interfaz (límite máximo gestionado por `MAX_COMMENTS_SELECTED_CAP = 10_000`).

### Integración con Supabase y Paginación PostgREST
La API de Supabase (PostgREST) tiene un límite de seguridad configurado por defecto (`max_rows = 1000`). Si el frontend solicita `supabase.from('comments').select('*')`, el servidor truncará la respuesta a 1,000 filas sin error.
- **Solución implementada:** En `SupabaseCommentRepository.ts`, se incluye una función `fetchAllComments` que utiliza `.range(from, to)` en un ciclo `while` iterando en bloques de 1,000 hasta traer los 5,000 o 10,000 comentarios guardados en la BD.

---

## 🧠 4. Backend (Python/FastAPI): El Core de IA

El backend (`/backend-python`) no gestiona usuarios de Supabase directamente ni guarda en base de datos. Su propósito es recibir JSONs pesados de comentarios, someterlos a modelos de IA, y devolver JSONs estructurados.

### Flujo Detallado de Análisis (`app/nlp/`)

#### 4.1. Extracción de Contexto (`youtube_context.py`)
Antes de analizar los comentarios, el sistema descarga automáticamente los subtítulos cerrados (CC) del video original usando la librería `youtube-transcript-api`. Luego, se envía esa enorme cadena de texto al LLM (Gemini Flash) para que genere un resumen de ~3000 tokens que encapsule el *tono*, las *bromas* y las *fricciones* expuestas por el creador en el video.

#### 4.2. Análisis de Sentimiento Local (`sentiment.py`)
Para optimizar costos y velocidad, la primera capa de NLP no usa APIs externas. Utiliza `pysentimiento` (basado en Transformers de HuggingFace optimizados para español).
- **Batching:** Procesa en lotes (`BATCH_SIZE=32` o `128`) directamente en CPU/GPU asignando etiquetas de `POS`, `NEG` o `NEU`.

#### 4.3. Deduplicación de Comentarios (`comment_dedup.py`)
Dado que en YouTube abundan los comentarios tipo "Jajajaja", "Primer comentario", "Hola" o emojis "🔥🔥", mandar todos al LLM consumiría miles de tokens innecesarios.
- El módulo clústeriza los comentarios mediante similitud Jaccard / Levenshtein y agrupación semántica básica.
- Al LLM solo se le envía un representante de cada cluster. Al regresar la respuesta del LLM, el backend clona el resultado (etiquetas, topic, intención) para todos los comentarios idénticos que fueron "ocultados".

#### 4.4. Enriquecimiento LLM (`gemini_analysis.py`, `openai_analysis.py`, `ollama_analysis.py`)
Soporta múltiples proveedores: Google Gemini, OpenAI/DeepSeek o infraestructura local usando Ollama.
- Agrupa los comentarios únicos en chunks (ej. 40-80).
- Ejecuta prompts estructurados para devolver exclusivamentte JSON.
- **Campos deducidos:** `engagement_type` (support, criticism, question, suggestion, problem), `topic` (Normalizado en pascal case), `intent` (Resumen de la intención del usuario).
- *Control de Concurrencia:* Utiliza semáforos asíncronos (`asyncio.Semaphore(4)`) para evitar excesos de tasa (Rate Limits) en APIs de terceros.

#### 4.5. Detección de Resonancia (`resonance.py`)
Cruza el "Video Context" obtenido en el paso 1 con las intenciones detectadas en el paso 4. Si el creador habló de "teclados mecánicos" y el usuario dice "ese sonido clicky es vida", lo marca como *resonancia de la audiencia* (el mensaje del video conectó directamente).

#### 4.6. Reporte Estratégico (`strategic_analysis.py`)
Luego de procesar los 5,000 comentarios individualmente, toma una síntesis global y solicita al LLM generar un reporte para humanos con: Tema dominante, Fricción principal y Oportunidades de contenido.

### Endpoints y Límites
- `POST /analyze/comments`: Procesamiento síncrono. Limitado a **50 comentarios**. Si se envían más, devuelve `409 Conflict`.
- `POST /analyze/comments/jobs`: Procesamiento asíncrono. Limitado a **10,000 comentarios**. Devuelve un `job_id`.
- `GET /analyze/comments/jobs/{job_id}`: Devuelve estado (`processing`, `completed`) y el resultado final estructurado.

---

## 🗄️ 5. Base de Datos (PostgreSQL en Supabase)

El sistema utiliza RLS (Row Level Security) para proteger que un creador no lea métricas de otro.
**Tablas principales:**
- `tracked_videos`: Contiene la metadata del video analizado (vistas, subs) y almacena en campos JSONB el `analysisReport`, `strategicReport` y el motor (`analysisEngine`) utilizado.
- `comments`: Almacena una fila por cada comentario procesado. Clave foránea a `tracked_videos.id`. **Tiene una restricción de unicidad múltiple (Unique Constraint)** en `(tracked_video_id, youtube_comment_id)` para prevenir duplicados en recargas. En el frontend se usan operaciones `upsert` ignorando conflictos sobre esta llave.

---

## 🔐 6. Configuración y Variables de Entorno (`.env`)

Para que el proyecto funcione en local, debes crear los archivos `.env` en cada subcarpeta basándote en los `.env.example`.

### `frontend/.env`
```env
# URL y clave anónima de tu proyecto de Supabase
VITE_SUPABASE_URL=https://<TU_PROYECTO>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...

# Clave de API de YouTube (Data API v3 requerida para leer comentarios)
VITE_YOUTUBE_API_KEY=AIzaSy...

# Ruta donde se levanta el servidor backend local
VITE_API_URL=http://localhost:8000
```

### `backend-python/.env`
```env
# Claves de YouTube para OAuth y lectura de transcripciones/estadísticas
YOUTUBE_API_KEY=AIzaSy...
YOUTUBE_ANALYTICS_API_KEY=AIzaSy...

# Configuración de OAuth2
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/youtube/callback
FRONTEND_URL=http://localhost:5173
STATE_SECRET=secreto_aleatorio_para_seguridad

# LLM APIs (Opcionales, puedes usar Ollama si no tienes keys)
GEMINI_API_KEY=AQ.Ab8...
OPENAI_API_KEY=sk-...

# Supabase - Se recomienda usar el SERVICE_ROLE para bypass de RLS en jobs de backend
SUPABASE_URL=https://<TU_PROYECTO>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

---

## 🚀 7. Flujo de Instalación y Desarrollo (Step-by-Step)

### Requisitos Previos
- Node.js v18+
- Python 3.10+
- Cuenta en Supabase y base de datos inicializada
- Claves de Google Cloud Console (YouTube Data API v3 activada)

### Levantar el Backend (Motor IA)
1. Abre una terminal y navega a `cd backend-python`.
2. Crea el entorno virtual: `python -m venv venv`.
3. Actívalo: `source venv/bin/activate` (Mac/Linux) o `venv\Scripts\activate` (Windows).
4. Instala dependencias: `pip install -r requirements.txt`.
5. Ejecuta el servidor de desarrollo: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`. *(O utiliza el script `./start.sh` si estás en Windows/Git Bash)*.

### Levantar la Web App (Frontend)
1. En otra terminal, navega a `cd frontend`.
2. Instala dependencias: `npm install`.
3. Levanta Vite: `npm run dev`. La plataforma correrá en `http://localhost:5173`.

### Levantar la Landing Page
1. En otra terminal, navega a `cd landing`.
2. Instala dependencias: `npm install`.
3. Levanta Vite: `npm run dev`. Correrá en `http://localhost:5174`.

---

## 🤝 8. Notas para Desarrolladores & Contribución

- **Modificación de Modelos DB:** Si alteras los tipos de datos o agregas columnas en Supabase, es **obligatorio** reflejar esos cambios en las interfaces TypeScript dentro de `frontend/src/domain/entities.ts` y ajustar las funciones de mapeo en `frontend/src/infrastructure/supabase/mappers.ts`. Si no lo haces, la UI romperá en silencio al intentar renderizar datos faltantes.
- **Nuevos Proveedores de IA:** Para integrar un nuevo proveedor LLM (ej: Claude o Llama), crea un nuevo archivo en `backend-python/app/nlp/` siguiendo la firma de función `analyze_comment_with_context` y registralo en el orquestador principal `analyze.py`.
- **Trabajo en la Landing:** La landing utiliza Tailwind v4. Recuerda que la configuración del tema y las variables de CSS ahora se inyectan en `index.css` vía directivas `@theme`, a diferencia de la versión 3 que usaba `tailwind.config.js`.

¡Bienvenido al equipo de **Content Radar**! Estamos listos para construir el futuro del análisis de audiencias. 🚀
