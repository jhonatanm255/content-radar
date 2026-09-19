"""Pruebas unitarias para deduplicación semántica del reporte estratégico."""
from app.nlp.strategic_analysis import deduplicate_strategic_report


def test_deduplicate_strategic_report_removes_duplicate_alerts():
    report = {
        "status": "success",
        "actionable_alerts": [
            {
                "severity": "ROJA",
                "title": "Fallas graves en el audio",
                "description": "El micrófono se corta frecuentemente.",
                "suggested_action": "Configurar filtro de ruido en OBS.",
            },
            {
                "severity": "ROJA",
                "title": "Fallas graves en el audio y sonido",
                "description": "El audio se corta.",
                "suggested_action": "Ajustar el micrófono.",
            },
            {
                "severity": "AMARILLA",
                "title": "Demanda de subtítulos en inglés",
                "description": "Varios usuarios piden subtítulos.",
                "suggested_action": "Subir archivo SRT.",
            },
        ],
        "content_opportunities": [
            {
                "topic": "Tutorial de Docker",
                "description": "Piden aprender Docker desde cero.",
                "priority": "high",
            },
            {
                "topic": "Tutorial de Docker para principiantes",
                "description": "Docker básico paso a paso.",
                "priority": "high",
            },
            {
                "topic": "Uso de Kubernetes",
                "description": "Piden K8s.",
                "priority": "medium",
            },
        ],
        "strategic_recommendations": [
            "Configurar filtro de ruido en OBS.",  # Ya es suggested_action de alerta
            "Publicar el tutorial de Docker antes del viernes.",
            "Publicar el tutorial de Docker antes del fin de semana.",  # Repetida
            "Revisar analíticas a los 3 días de publicación.",
        ],
    }

    clean = deduplicate_strategic_report(report)

    # Las 2 alertas de audio deben haberse colapsado a 1
    assert len(clean["actionable_alerts"]) == 2
    alert_titles = [a["title"] for a in clean["actionable_alerts"]]
    assert "Fallas graves en el audio" in alert_titles
    assert "Demanda de subtítulos en inglés" in alert_titles

    # Las 2 oportunidades de Docker deben haberse colapsado a 1
    assert len(clean["content_opportunities"]) == 2
    opp_topics = [o["topic"] for o in clean["content_opportunities"]]
    assert "Tutorial de Docker" in opp_topics
    assert "Uso de Kubernetes" in opp_topics

    # Las recomendaciones no deben repetir la acción de OBS ni duplicar la de Docker
    recs = clean["strategic_recommendations"]
    assert len(recs) <= 2
    assert not any("filtro de ruido en obs" in r.lower() for r in recs)
