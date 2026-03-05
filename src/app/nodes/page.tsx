'use client';

import { useState, useMemo } from 'react';
import {
  NODE_TYPES,
  NODE_CATEGORIES,
  getNodesByCategory,
  getErrorPatternsForNodeType,
  type NodeTypeDefinition,
} from '@/data/master-data';
import Navigation from '@/components/Navigation';

type CategoryFilter = 'all' | NodeTypeDefinition['category'];

const CATEGORY_ICONS: Record<string, string> = {
  trigger: '⚡',
  llm: '🧠',
  tool: '🔧',
  logic: '🔀',
  output: '📤',
};

export default function NodesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return NODE_TYPES;
    return getNodesByCategory(selectedCategory);
  }, [selectedCategory]);

  const categoryEntries = Object.entries(NODE_CATEGORIES) as Array<
    [NodeTypeDefinition['category'], { label: string; description: string }]
  >;

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="nodes-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            ノードカタログ
          </h1>
          <p className="text-sm text-gray-500">
            ワークフローで使用できる全{NODE_TYPES.length}種類のノードを確認
          </p>
        </div>

        {/* Category Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="category-summary">
          {categoryEntries.map(([key, cat]) => {
            const count = getNodesByCategory(key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  selectedCategory === key
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
                data-testid={`category-card-${key}`}
              >
                <span className="text-2xl">{CATEGORY_ICONS[key]}</span>
                <p className="mt-1 text-sm font-semibold text-gray-900">{cat.label}</p>
                <p className="text-xs text-gray-500">{count}種類</p>
              </button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2" data-testid="category-filter">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            すべて ({NODE_TYPES.length})
          </button>
          {categoryEntries.map(([key, cat]) => {
            const count = getNodesByCategory(key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_ICONS[key]} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Node List */}
        <div className="space-y-3" data-testid="node-list">
          {filteredNodes.map((node) => {
            const isExpanded = expandedId === node.id;
            const errorPatterns = getErrorPatternsForNodeType(node.category);

            return (
              <div
                key={node.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                data-testid={`node-card-${node.id}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : node.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                      style={{ backgroundColor: `${node.color}15` }}
                    >
                      {node.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{node.name}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {NODE_CATEGORIES[node.category].label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{node.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-gray-400">平均レイテンシ</p>
                      <p className="text-sm font-medium text-gray-700">{node.avgLatencyMs}ms</p>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3" data-testid="node-details">
                    {/* Performance Metrics */}
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">平均レイテンシ</p>
                        <p className="text-lg font-bold text-gray-900">{node.avgLatencyMs}ms</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">実行コスト</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${node.costPerExecution.toFixed(4)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">カテゴリ</p>
                        <p className="text-lg font-bold text-gray-900">
                          {NODE_CATEGORIES[node.category].label}
                        </p>
                      </div>
                    </div>

                    {/* Config Schema */}
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">設定項目</h4>
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">項目名</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">型</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">必須</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">デフォルト</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(node.configSchema).map(([fieldName, field]) => (
                              <tr key={fieldName} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-medium text-gray-900">{field.label}</td>
                                <td className="px-3 py-2">
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                                    {field.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {field.required ? (
                                    <span className="text-red-500">必須</span>
                                  ) : (
                                    <span className="text-gray-400">任意</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {field.defaultValue !== undefined ? String(field.defaultValue) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Available Error Patterns */}
                    {errorPatterns.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">
                          対応エラーハンドリング ({errorPatterns.length}パターン)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {errorPatterns.map((pattern) => (
                            <span
                              key={pattern.id}
                              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
                            >
                              {pattern.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
