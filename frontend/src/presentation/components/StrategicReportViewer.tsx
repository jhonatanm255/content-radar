import React from 'react';
import { StrategicReport } from '../../domain/commentAnalysis';

interface StrategicReportViewerProps {
  report: StrategicReport;
  compact?: boolean;
}

export const StrategicReportViewer: React.FC<StrategicReportViewerProps> = ({
  report,
  compact = false,
}) => {
  if (report.status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Error en análisis estratégico: {report.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RESUMEN GENERAL */}
      {report.summary && (
        <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">📊 Resumen General</h3>
          <p className="text-blue-800 text-sm leading-relaxed">{report.summary}</p>
        </section>
      )}

      {/* SENTIMIENTOS CON GRÁFICO */}
      {report.sentiment_analysis && (
        <section className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">💭 Análisis de Sentimientos</h3>
          
          <div className="space-y-3">
            {/* Gráfico de barras simplificado */}
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm text-gray-600">Positivo</span>
              <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${report.sentiment_analysis.positive_percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-medium">
                {report.sentiment_analysis.positive_percent}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 text-sm text-gray-600">Neutral</span>
              <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all"
                  style={{ width: `${report.sentiment_analysis.neutral_percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-medium">
                {report.sentiment_analysis.neutral_percent}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-20 text-sm text-gray-600">Negativo</span>
              <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${report.sentiment_analysis.negative_percent}%` }}
                />
              </div>
              <span className="w-12 text-right text-sm font-medium">
                {report.sentiment_analysis.negative_percent}%
              </span>
            </div>
          </div>

          {/* Matices */}
          {report.sentiment_analysis.nuances && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700 italic">
              {report.sentiment_analysis.nuances}
            </div>
          )}
        </section>
      )}

      {/* ALERTAS ACCIONABLES */}
      {report.actionable_alerts && report.actionable_alerts.length > 0 && (
        <section className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">🚨 Alertas Accionables</h3>
          <div className="space-y-3">
            {report.actionable_alerts.map((alert, idx) => {
              const bgColor =
                alert.severity === 'ROJA'
                  ? 'bg-red-50 border-red-200'
                  : alert.severity === 'AMARILLA'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200';

              const badgeColor =
                alert.severity === 'ROJA'
                  ? 'bg-red-500'
                  : alert.severity === 'AMARILLA'
                  ? 'bg-yellow-500'
                  : 'bg-green-500';

              const icon =
                alert.severity === 'ROJA'
                  ? '🔴'
                  : alert.severity === 'AMARILLA'
                  ? '🟡'
                  : '🟢';

              return (
                <div
                  key={idx}
                  className={`p-3 rounded border ${bgColor}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{alert.description}</p>
                      <p className="text-xs text-gray-600 mt-2 font-semibold">
                        ➜ {alert.suggested_action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MÉTRICAS DE ENGAGEMENT */}
      {report.engagement_metrics && (
        <section className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">📈 Métricas de Engagement</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Nivel de Participación</p>
              <p className="text-sm font-bold text-gray-900 capitalize">
                {report.engagement_metrics.participation_level}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600">Potencial Viral</p>
              <p className="text-sm font-bold text-gray-900">
                {report.engagement_metrics.viral_potential}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded col-span-2">
              <p className="text-xs text-gray-600 mb-1">Patrón de Consumo</p>
              <p className="text-sm text-gray-800">{report.engagement_metrics.consumption_pattern}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded col-span-2">
              <p className="text-xs text-gray-600 mb-1">Lealtad Comunitaria</p>
              <p className="text-sm text-gray-800">{report.engagement_metrics.community_loyalty}</p>
            </div>
          </div>
        </section>
      )}

      {/* OPORTUNIDADES DE CONTENIDO */}
      {report.content_opportunities && report.content_opportunities.length > 0 && (
        <section className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">💡 Oportunidades de Contenido</h3>
          <div className="space-y-3">
            {report.content_opportunities.map((opp, idx) => {
              const priorityColor =
                opp.priority === 'high'
                  ? 'text-red-600 bg-red-50'
                  : opp.priority === 'medium'
                  ? 'text-yellow-600 bg-yellow-50'
                  : 'text-blue-600 bg-blue-50';

              const sourceIcon = opp.source === 'direct' ? '📌' : '💭';

              return (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{sourceIcon}</span>
                        <h4 className="font-semibold text-gray-900">{opp.topic}</h4>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{opp.description}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${priorityColor}`}
                    >
                      {opp.priority === 'high'
                        ? 'Alta'
                        : opp.priority === 'medium'
                        ? 'Media'
                        : 'Baja'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* RECOMENDACIONES ESTRATÉGICAS */}
      {report.strategic_recommendations && report.strategic_recommendations.length > 0 && (
        <section className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">🎯 Recomendaciones Estratégicas</h3>
          <ul className="space-y-2">
            {report.strategic_recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-gray-700">
                <span className="text-blue-500 font-bold">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* PRÓXIMOS PASOS */}
      {report.next_steps && (
        <section className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <h3 className="font-bold text-indigo-900 mb-2">📋 Próximos Pasos</h3>
          <p className="text-indigo-800 text-sm leading-relaxed">{report.next_steps}</p>
        </section>
      )}

      {/* METADATA */}
      {!compact && report.total_comments && (
        <div className="text-xs text-gray-500 pt-2 border-t">
          Análisis de {report.total_comments} comentarios de "{report.video_title}"
        </div>
      )}
    </div>
  );
};
