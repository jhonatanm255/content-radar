#!/bin/bash
# ==============================================================================
# SCRIPT DE ARRANQUE: CLIP-RADAR (BACKEND + FRONTEND)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Iniciando Clip Radar..."

# 1. Iniciar Backend en puerto 8001
cd "$DIR/backend"
source .venv/bin/activate
python3 -m uvicorn app.main:app --reload --reload-dir app --port 8001 &
BACKEND_PID=$!
echo "✅ Backend corriendo en http://localhost:8001 (PID: $BACKEND_PID)"

# 2. Iniciar Frontend en puerto 5174
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend corriendo en http://localhost:5174 (PID: $FRONTEND_PID)"

# Función para detener ambos procesos con Ctrl+C
trap "echo 'Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM EXIT

wait
