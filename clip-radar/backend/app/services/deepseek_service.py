import json
import re
from openai import OpenAI
from app.core.config import settings

class DeepSeekService:
    def __init__(self):
        # Cliente compatible con OpenAI consumiendo la API de DeepSeek
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL
        )

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1).strip()
        return text

    def extract_highlights(self, transcript_segments: list) -> list:
        """
        Analiza las marcas de tiempo y el texto para extraer los momentos más virales.
        """
        prompt = f"""
        Eres un editor de video viral profesional (estilo OpusClip / ClipHit).
        A continuación tienes una transcripción de un podcast o video largo con marcas de tiempo (en segundos).

        Tu misión:
        1. Identificar entre 3 y 8 de los mejores momentos (duración ideal entre 25s y 70s).
        2. Cada clip debe tener un hook (gancho) potente al inicio, desarrollo y conclusión clara.
        3. Asigna un virality_score (0 a 100) y explica por qué funcionará.

        Transcripción:
        {json.dumps(transcript_segments, ensure_ascii=False)}

        Devuelve EXCLUSIVAMENTE un arreglo JSON válido con el siguiente formato, sin texto adicional:
        [
          {{
            "title": "Título corto y llamativo",
            "hook_sentence": "Primera frase llamativa",
            "summary": "Resumen breve del clip",
            "start_time": 12.5,
            "end_time": 54.0,
            "virality_score": 92,
            "virality_reason": "Comienza con una declaración controvertida y resuelve con un consejo accionable."
          }}
        ]
        """

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Eres un extractor de clips virales que solo responde con un JSON válido."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        content = self._clean_json_response(response.choices[0].message.content)
        data = json.loads(content)
        return data.get("clips", data) if isinstance(data, dict) else data

    def refine_with_prompt(self, transcript_segments: list, user_prompt: str) -> list:
        """
        Refina o busca nuevos clips según una instrucción de texto personalizada del usuario.
        """
        prompt = f"""
        El usuario requiere clips con este enfoque específico: "{user_prompt}".

        Basándote en la siguiente transcripción:
        {json.dumps(transcript_segments, ensure_ascii=False)}

        Extrae los momentos que coincidan con la petición del usuario (duración 20s - 75s).
        Devuelve EXCLUSIVAMENTE un JSON:
        {{
          "clips": [
            {{
              "title": "Título llamativo",
              "hook_sentence": "Gancho inicial",
              "summary": "Resumen",
              "start_time": 100.0,
              "end_time": 145.2,
              "virality_score": 88,
              "virality_reason": "Justificación según el prompt"
            }}
          ]
        }}
        """

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "Experto en edición que responde en formato JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        content = self._clean_json_response(response.choices[0].message.content)
        data = json.loads(content)
        return data.get("clips", []) if isinstance(data, dict) else data
