#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Si existe un .venv de Windows (sin bin/python) en Unix/macOS, se elimina para recrearlo limpio
if [ -d ".venv" ] && [ ! -f ".venv/bin/python" ]; then
  echo "Detectado .venv incompatible con macOS. Eliminando y creando uno nuevo..."
  rm -rf .venv
fi

venv_python() {
  if [ -x ".venv/bin/python" ]; then
    echo ".venv/bin/python"
  elif [ -x ".venv/Scripts/python.exe" ]; then
    echo ".venv/Scripts/python.exe"
  else
    echo ".venv/bin/python"
  fi
}

if [ ! -d ".venv" ]; then
  python3 -m venv .venv 2>/dev/null || python -m venv .venv
  "$(venv_python)" -m pip install -r requirements.txt
fi

exec "$(venv_python)" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
