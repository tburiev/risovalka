import { useState, useEffect } from 'react';
import * as api from '../api';

interface Visitor {
  id: number;
  ip_address: string;
  user_agent: string;
  browser: string;
  country: string | null;
  city: string | null;
  last_visit: string;
  visit_count: number;
}

interface StatsModalProps {
  onClose: () => void;
}

export default function StatsModal({ onClose }: StatsModalProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.fetchVisitors();
      setVisitors(data);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить статистику');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseBrowser = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Other';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">📈 Статистика посещений</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Загрузка...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">⚠️ {error}</div>
              <button
                onClick={loadStats}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Повторить
              </button>
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Нет данных о посещениях
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{visitors.length}</div>
                  <div className="text-sm text-gray-600">Уникальных посетителей</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {visitors.reduce((sum, v) => sum + v.visit_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Всего визитов</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Set(visitors.map(v => v.country).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600">Стран</div>
                </div>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">IP адрес</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Браузер</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Геолокация</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Визитов</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Последний вход</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((visitor) => (
                      <tr key={visitor.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-700">{visitor.ip_address}</td>
                        <td className="px-4 py-3 text-gray-600">{visitor.browser}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {visitor.country ? (
                            <span>
                              {visitor.city && `${visitor.city}, `}
                              {visitor.country}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          {visitor.visit_count}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(visitor.last_visit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
