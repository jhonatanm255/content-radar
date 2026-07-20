#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

venv_python() {
  if [ -x ".venv/Scripts/python.exe" ]; then
    echo ".venv/Scripts/python"
  elif [ -x ".venv/Scripts/python" ]; then
    echo ".venv/Scripts/python"
  else
    echo ".venv/bin/python"
  fi
}

if [ ! -d ".venv" ]; then
  python3 -m venv .venv 2>/dev/null || python -m venv .venv
  "$(venv_python)" -m pip install -r requirements.txt
fi

exec "$(venv_python)" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
