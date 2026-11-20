# ClipRadar — AI Video Clipper (Microservicio Independiente)

Módulo autónomo para la plataforma **Content Radar** (`contentradar.tech`) diseñado para la extracción automática de clips y momentos virales a partir de podcasts y videos largos (estilo OpusClip / ClipHit).

---

## 🏗️ Arquitectura y Aislamiento

Este microservicio está **completamente aislado** del resto del código de Content Radar:
- **Base de datos propia:** Utiliza su propio esquema o proyecto independiente de Supabase (`clip-radar/supabase/schema.sql`).
- **Backend dedicado:** Servicio en FastAPI (`clip-radar/backend`) desplegable en Railway con FFmpeg nativo y procesamiento asíncrono en segundo plano.
- **Frontend autónomo:** SPA en React + Tailwind (`clip-radar/frontend`) desplegable en Vercel.

---

## 🚀 Pipeline de Inteligencia Artificial

1. **Subida y Storage:** Almacenamiento del video largo en un bucket dedicado de **Cloudflare R2** (`clips-media`). Zero egress fees.
2. **Extracción de Audio:** Uso de `FFmpeg` para aislar la pista de audio en MP3 optimizado a 128k.
3. **Transcripción:** Envío del audio a **AssemblyAI (Universal-2)** con marcas de tiempo exactas por segmento.
4. **Highlights con DeepSeek API:** Extracción estructurada de los momentos con mayor potencial viral (hooks, tiempos de inicio/fin, virality score).
5. **Refinamiento interactivo:** Chat en tiempo real para filtrar clips según temáticas solicitadas por el usuario.
6. **Recorte y Optimización de Costes:** FFmpeg recorta el fragmento vertical (9:16 centrado), lo sube a Cloudflare R2 y **elimina el archivo original pesado** de R2 para optimizar costes.

---

## 🛠️ Configuración y Despliegue

### 1. Base de datos (Supabase)
Ejecuta el script SQL en el SQL Editor de tu proyecto independiente de Supabase:
```bash
clip-radar/supabase/schema.sql
```

### 2. Almacenamiento (Cloudflare R2)
Crea un bucket en Cloudflare R2 (ej. `clips-media`) y obtén un token API con permisos de lectura/escritura (S3-compatible). Habilita el dominio público R2.dev o un custom domain para reproducir los clips recortados.

### 3. Backend (Railway)
1. Conecta el repositorio en Railway configurando el **Root Directory** en `clip-radar/backend`.
2. Railway detectará el `Dockerfile` (que contiene FFmpeg preinstalado).
3. Añade las siguientes Variables de Entorno:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   R2_ACCOUNT_ID=tu-cloudflare-account-id
   R2_ACCESS_KEY_ID=tu-r2-access-key-id
   R2_SECRET_ACCESS_KEY=tu-r2-secret-access-key
   R2_BUCKET_NAME=clips-media
   R2_PUBLIC_DOMAIN=https://pub-xxxxxxxx.r2.dev
   ASSEMBLYAI_API_KEY=tu-assemblyai-key
   DEEPSEEK_API_KEY=tu-deepseek-key
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   ```

### 3. Frontend (Vercel)
1. Importa el proyecto en Vercel con **Root Directory** en `clip-radar/frontend`.
2. Añade la variable de entorno:
   ```env
   VITE_CLIP_API_URL=https://tu-backend-en-railway.up.railway.app
   ```
3. Framework Preset: **Vite**.

---

## 💻 Ejecución Local

### Backend:
```bash
cd clip-radar/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env # Completar tus credenciales
uvicorn app.main:app --reload --port 8000
```

### Frontend:
```bash
cd clip-radar/frontend
npm install
npm run dev
```
