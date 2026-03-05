'use client';

import { useState, useMemo } from 'react';
import {
  ERROR_HANDLING_PATTERNS,
  NODE_CATEGORIES,
  type ErrorHandlingPattern,
  type NodeTypeDefinition,
} from '@/data/master-data';
import Navigation from '@/components/Navigation';

type StrategyFilter = 'all' | ErrorHandlingPattern['strategy'];

const STRATEGY_LABELS: Record<ErrorHandlingPattern['strategy'], string> = {
  retry: 'リトライ',
  fallback: 'フォールバック',
  timeout: 'タイムアウト',
  human_intervention: '人間介入',
  circuit_breaker: 'サーキットブレーカー',
  dead_letter: 'デッドレター',
};

const STRATEGY_ICONS: Record<ErrorHandlingPattern['strategy'], string> = {
  retry: '🔄',
  fallback: '🔀',
  timeout: '⏱️',
  human_intervention: '👤',
  circuit_breaker: '🔌',
  dead_letter: '📭',
};

const STRATEGY_COLORS: Record<ErrorHandlingPattern['strategy'], string> = {
  retry: '#3b82f6',
  fallback: '#8b5cf6',
  timeout: '#f59e0b',
  human_intervention: '#ef4444',
  circuit_breaker: '#ec4899',
  dead_letter: '#6366f1',
};

const SEVERITY_BADGES: Record<ErrorHandlingPattern['severityLevel'], string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const SEVERITY_LABELS: Record<ErrorHandlingPattern['severityLevel'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '重大',
};

export default function ErrorsPage() {
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredPatterns = useMemo(() => {
    if (strategyFilter === 'all') return ERROR_HANDLING_PATTERNS;
    return ERROR_HANDLING_PATTERNS.filter((p) => p.strategy === strategyFilter);
  }, [strategyFilter]);

  const strategyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ERROR_HANDLING_PATTERNS) {
      counts[p.strategy] = (counts[p.strategy] ?? 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="errors-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">エラーハンドリングパターン</h1>
          <p className="text-sm text-gray-500">
            ワークフローの信頼性を高める{ERROR_HANDLING_PATTERNS.length}種類のパターン
          </p>
        </div>

        {/* Strategy Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="strategy-overview">
          {(Object.entries(STRATEGY_LABELS) as Array<[ErrorHandlingPattern['strategy'], string]>).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setStrategyFilter(strategyFilter === key ? 'all' : key)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  strategyFilter === key
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <span className="text-2xl">{STRATEGY_ICONS[key]}</span>
                <p className="mt-1 text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{strategyCounts[key] ?? 0}パターン</p>
              </button>
            )
          )}
        </div>

        {/* Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2" data-testid="strategy-filter">
          <button
            onClick={() => setStrategyFilter('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              strategyFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            すべて ({ERROR_HANDLING_PATTERNS.length})
          </button>
          {(Object.entries(STRATEGY_LABELS) as Array<[ErrorHandlingPattern['strategy'], string]>).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setStrategyFilter(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  strategyFilter === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {STRATEGY_ICONS[key]} {label} ({strategyCounts[key] ?? 0})
              </button>
            )
          )}
        </div>

        {/* Pattern Cards */}
        <div className="space-y-3" data-testid="pattern-list">
          {filteredPatterns.map((pattern) => {
            const isExpanded = expandedId === pattern.id;
            return (
              <div
                key={pattern.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                data-testid={`pattern-card-${pattern.id}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : pattern.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                      style={{ backgroundColor: `${STRATEGY_COLORS[pattern.strategy]}15` }}
                    >
                      {STRATEGY_ICONS[pattern.strategy]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{pattern.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGES[pattern.severityLevel]}`}>
                          {SEVERITY_LABELS[pattern.severityLevel]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{pattern.description}</p>
                    </div>
                  </div>
                  <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3" data-testid="pattern-details">
                    {/* Default Config */}
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">デフォルト設定</h4>
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                パラメータ
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                値
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(pattern.defaultConfig).map(([key, value]) => (
                              <tr key={key} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-medium text-gray-900">{key}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                                    {String(value)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Applicable Node Types */}
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">
                        対応ノードカテゴリ
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {pattern.applicableNodeTypes.map((cat: NodeTypeDefinition['category']) => (
                          <span
                            key={cat}
                            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
                          >
                            {NODE_CATEGORIES[cat].label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Strategy Info */}
                    <div className="rounded-lg bg-indigo-50 p-3">
                      <p className="text-xs font-medium text-indigo-700">
                        戦略タイプ: {STRATEGY_LABELS[pattern.strategy]}
                      </p>
                      <p className="mt-1 text-xs text-indigo-600">
                        英語名: {pattern.nameEn}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Navigation />
    </div>
  );
}
