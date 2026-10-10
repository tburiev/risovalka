import { useState, useEffect } from 'react';
import * as api from '../api';

interface Visitor {
  id: number;
  ip_address: string;
  user_agent: string;
  browser: string;
  country: string | null;
  city: string | null;
  visit_time: string;
}

interface GroupedVisitor {
  key: string;
  ip_address: string;
  browser: string;
  country: string | null;
  city: string | null;
  visits: Visitor[];
  lastVisit: string;
}

interface StatsModalProps {
  onClose: () => void;
}

export default function StatsModal({ onClose }: StatsModalProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
      second: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Группировка посетителей по IP + браузер
  const groupedVisitors: GroupedVisitor[] = visitors.reduce((acc, visitor) => {
    const key = `${visitor.ip_address}_${visitor.browser}`;
    const existing = acc.find(g => g.key === key);
    
    if (existing) {
      existing.visits.push(visitor);
      // Обновляем последний визит если текущий новее
      if (new Date(visitor.visit_time) > new Date(existing.lastVisit)) {
        existing.lastVisit = visitor.visit_time;
      }
    } else {
      acc.push({
        key,
        ip_address: visitor.ip_address,
        browser: visitor.browser,
        country: visitor.country,
        city: visitor.city,
        visits: [visitor],
        lastVisit: visitor.visit_time,
      });
    }
    
    return acc;
  }, [] as GroupedVisitor[]);

  // Сортировка по последнему визиту
  groupedVisitors.sort((a, b) => new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime());

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const uniqueIPs = new Set(visitors.map(v => v.ip_address)).size;
  const uniqueCountries = new Set(visitors.map(v => v.country).filter(Boolean)).size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
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
                  <div className="text-2xl font-bold text-blue-600">{uniqueIPs}</div>
                  <div className="text-sm text-gray-600">Уникальных IP</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{visitors.length}</div>
                  <div className="text-sm text-gray-600">Всего входов</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{uniqueCountries}</div>
                  <div className="text-sm text-gray-600">Стран</div>
                </div>
              </div>

              {/* Grouped Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">IP адрес</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Браузер</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Геолокация</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">Входов</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Последний вход</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedVisitors.map((group) => {
                      const isExpanded = expandedGroups.has(group.key);
                      const visitCount = group.visits.length;
                      
                      return (
                        <>
                          {/* Group header */}
                          <tr 
                            key={group.key}
                            className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleGroup(group.key)}
                          >
                            <td className="px-4 py-3 text-gray-400">
                              <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700">{group.ip_address}</td>
                            <td className="px-4 py-3 text-gray-600">{group.browser}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {group.country ? (
                                <span>
                                  {group.city && `${group.city}, `}
                                  {group.country}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              {visitCount}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatShortDate(group.lastVisit)}</td>
                          </tr>
                          
                          {/* Expanded visits */}
                          {isExpanded && group.visits.map((visit) => (
                            <tr 
                              key={visit.id}
                              className="bg-gray-50 border-t border-gray-100"
                            >
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 text-gray-500 text-xs" colSpan={4}>
                                <span className="ml-4">🕐 {formatDate(visit.visit_time)}</span>
                                {visit.user_agent && (
                                  <span className="ml-4 text-gray-400 text-xs">
                                    {visit.user_agent.substring(0, 60)}...
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-xs text-right">
                                #{visit.id}
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Всего записей: {visitors.length}
          </div>
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
