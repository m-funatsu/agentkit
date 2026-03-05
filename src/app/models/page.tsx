'use client';

import { useState, useMemo } from 'react';
import {
  LLM_MODELS,
  getLLMModelsByProvider,
  getLLMModelsByTier,
  USD_TO_JPY_RATE,
  type LLMModelSpec,
} from '@/data/master-data';
import Navigation from '@/components/Navigation';

type ProviderFilter = 'all' | LLMModelSpec['provider'];
type TierFilter = 'all' | LLMModelSpec['tier'];
type SortKey = 'quality' | 'speed' | 'cost' | 'latency';

const PROVIDER_LABELS: Record<LLMModelSpec['provider'], string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
};

const PROVIDER_COLORS: Record<LLMModelSpec['provider'], string> = {
  anthropic: '#d97706',
  openai: '#10b981',
  google: '#4285f4',
};

const TIER_LABELS: Record<LLMModelSpec['tier'], string> = {
  flagship: 'Flagship',
  balanced: 'Balanced',
  fast: 'Fast',
};

const TIER_BADGE_COLORS: Record<LLMModelSpec['tier'], string> = {
  flagship: 'bg-purple-100 text-purple-700',
  balanced: 'bg-blue-100 text-blue-700',
  fast: 'bg-green-100 text-green-700',
};

function ScoreBar({ score, max = 10, color }: { score: number; max?: number; color: string }) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-5 text-right">{score}</span>
    </div>
  );
}

export default function ModelsPage() {
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('quality');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    let models = LLM_MODELS;
    if (provider !== 'all') {
      models = getLLMModelsByProvider(provider);
    }
    if (tier !== 'all') {
      models = models.filter((m) => m.tier === tier);
    }

    const sorted = [...models];
    switch (sortBy) {
      case 'quality':
        sorted.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      case 'speed':
        sorted.sort((a, b) => b.speedScore - a.speedScore);
        break;
      case 'cost':
        sorted.sort((a, b) => b.costEfficiencyScore - a.costEfficiencyScore);
        break;
      case 'latency':
        sorted.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs);
        break;
    }
    return sorted;
  }, [provider, tier, sortBy]);

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of ['anthropic', 'openai', 'google'] as const) {
      counts[p] = getLLMModelsByProvider(p).length;
    }
    return counts;
  }, []);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of ['flagship', 'balanced', 'fast'] as const) {
      counts[t] = getLLMModelsByTier(t).length;
    }
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="models-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">LLMモデル比較</h1>
          <p className="text-sm text-gray-500">
            全{LLM_MODELS.length}モデルの性能・コスト・特性を比較
          </p>
        </div>

        {/* Provider Summary */}
        <div className="mb-6 grid grid-cols-3 gap-3" data-testid="provider-summary">
          {(Object.entries(PROVIDER_LABELS) as Array<[LLMModelSpec['provider'], string]>).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setProvider(provider === key ? 'all' : key)}
                className={`rounded-xl border p-4 text-center transition-all ${
                  provider === key
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
                data-testid={`provider-${key}`}
              >
                <div
                  className="mx-auto mb-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: PROVIDER_COLORS[key] }}
                />
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{providerCounts[key]}モデル</p>
              </button>
            )
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="py-1 text-xs font-medium text-gray-500">ティア:</span>
            <button
              onClick={() => setTier('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tier === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            {(Object.entries(TIER_LABELS) as Array<[LLMModelSpec['tier'], string]>).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTier(tier === key ? 'all' : key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tier === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label} ({tierCounts[key]})
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">並び替え:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700"
            >
              <option value="quality">品質スコア</option>
              <option value="speed">速度スコア</option>
              <option value="cost">コスト効率</option>
              <option value="latency">レイテンシ</option>
            </select>
          </div>
        </div>

        {/* Model Cards */}
        <div className="space-y-3" data-testid="model-list">
          {filteredModels.map((model) => {
            const isExpanded = expandedId === model.id;
            return (
              <div
                key={model.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                data-testid={`model-card-${model.id}`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : model.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PROVIDER_COLORS[model.provider] }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{model.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE_COLORS[model.tier]}`}>
                          {TIER_LABELS[model.tier]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {PROVIDER_LABELS[model.provider]} | {model.avgLatencyMs}ms | コンテキスト: {(model.maxContextTokens / 1000).toLocaleString()}K
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-6 text-center">
                      <div>
                        <p className="text-xs text-gray-400">品質</p>
                        <p className="text-sm font-bold text-gray-900">{model.qualityScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">速度</p>
                        <p className="text-sm font-bold text-gray-900">{model.speedScore}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">効率</p>
                        <p className="text-sm font-bold text-gray-900">{model.costEfficiencyScore}</p>
                      </div>
                    </div>
                    <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3" data-testid="model-details">
                    {/* Scores */}
                    <div className="mb-4 space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">品質スコア</span>
                        <ScoreBar score={model.qualityScore} color="#8b5cf6" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">速度スコア</span>
                        <ScoreBar score={model.speedScore} color="#10b981" />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">コスト効率</span>
                        <ScoreBar score={model.costEfficiencyScore} color="#f59e0b" />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">入力 / 1Kトークン</p>
                        <p className="text-sm font-bold text-gray-900">
                          ${model.inputCostPer1kTokens}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(model.inputCostPer1kTokens * USD_TO_JPY_RATE).toFixed(2)}円
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">出力 / 1Kトークン</p>
                        <p className="text-sm font-bold text-gray-900">
                          ${model.outputCostPer1kTokens}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(model.outputCostPer1kTokens * USD_TO_JPY_RATE).toFixed(2)}円
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">最大コンテキスト</p>
                        <p className="text-sm font-bold text-gray-900">
                          {(model.maxContextTokens / 1000).toLocaleString()}K
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">最大出力</p>
                        <p className="text-sm font-bold text-gray-900">
                          {(model.maxOutputTokens / 1000).toLocaleString()}K
                        </p>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="mb-3">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">強み</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.strengths.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Best For */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">最適な用途</h4>
                      <div className="flex flex-wrap gap-2">
                        {model.bestFor.map((b) => (
                          <span
                            key={b}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
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
