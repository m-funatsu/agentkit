'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  WORKFLOW_TEMPLATES,
  COST_PARAMETERS,
  NODE_TYPES,
  USD_TO_JPY_RATE,
  getCostParametersByCategory,
  getNodeById,
  type CostParameter,
  type WorkflowTemplate,
} from '@/data/master-data';
import {
  estimateCost,
  optimizeTokenUsage,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type CostEstimate,
  type TokenOptimization,
} from '@/lib/logic';
import Navigation from '@/components/Navigation';

const COST_CATEGORY_LABELS: Record<CostParameter['category'], string> = {
  token: 'トークン',
  api_call: 'API呼び出し',
  execution_time: '実行時間',
  storage: 'ストレージ',
  bandwidth: '帯域幅',
};

function buildWorkflowFromTemplate(template: WorkflowTemplate): Workflow {
  const nodes: WorkflowNode[] = template.nodeSequence.map((nodeTypeId, idx) => ({
    id: `node_${idx}`,
    nodeTypeId,
    label: getNodeById(nodeTypeId)?.name ?? nodeTypeId,
    config: {},
  }));

  const edges: WorkflowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `edge_${i}`,
      sourceNodeId: nodes[i].id,
      targetNodeId: nodes[i + 1].id,
    });
  }

  return { id: template.id, name: template.name, nodes, edges };
}

export default function CostPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(WORKFLOW_TEMPLATES[0].id);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(100);
  const [showPricing, setShowPricing] = useState(false);

  const selectedTemplate = useMemo(
    () => WORKFLOW_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? WORKFLOW_TEMPLATES[0],
    [selectedTemplateId]
  );

  const workflow = useMemo(() => buildWorkflowFromTemplate(selectedTemplate), [selectedTemplate]);

  const costEstimate: CostEstimate = useMemo(
    () => estimateCost(workflow, monthlyVolume),
    [workflow, monthlyVolume]
  );

  const tokenOptimizations: TokenOptimization[] = useMemo(
    () => optimizeTokenUsage(workflow),
    [workflow]
  );

  const costCategories = useMemo(() => {
    const categories: CostParameter['category'][] = ['token', 'api_call', 'execution_time', 'storage'];
    return categories.map((cat) => ({
      category: cat,
      label: COST_CATEGORY_LABELS[cat],
      parameters: getCostParametersByCategory(cat),
    }));
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 0) {
      setMonthlyVolume(val);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="cost-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">コスト分析</h1>
          <p className="text-sm text-gray-500">
            ワークフローの実行コストを試算し、最適化の機会を発見
          </p>
        </div>

        {/* Template Selection */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="template-selector">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">分析対象テンプレート</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplateId(tmpl.id)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  selectedTemplateId === tmpl.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                data-testid={`template-option-${tmpl.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tmpl.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tmpl.name}</p>
                    <p className="text-xs text-gray-500">{tmpl.category}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Volume Input */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">月間実行回数</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10000}
              value={monthlyVolume}
              onChange={handleVolumeChange}
              className="flex-1"
            />
            <input
              type="number"
              min={1}
              max={100000}
              value={monthlyVolume}
              onChange={handleVolumeChange}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-right text-gray-900"
            />
            <span className="text-sm text-gray-500">回/月</span>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="cost-summary">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">1回あたり</p>
            <p className="text-2xl font-bold text-gray-900">
              ${costEstimate.perExecutionCost.totalUsd.toFixed(4)}
            </p>
            <p className="text-sm text-gray-500">
              {costEstimate.perExecutionCost.totalJpy.toFixed(2)}円
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm text-center">
            <p className="text-xs text-indigo-600 mb-1">月間コスト</p>
            <p className="text-2xl font-bold text-indigo-900">
              ${costEstimate.monthlyCost.totalUsd.toFixed(2)}
            </p>
            <p className="text-sm text-indigo-600">
              {costEstimate.monthlyCost.totalJpy.toLocaleString()}円
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">年間コスト</p>
            <p className="text-2xl font-bold text-gray-900">
              ${costEstimate.yearlyCost.totalUsd.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {costEstimate.yearlyCost.totalJpy.toLocaleString()}円
            </p>
          </div>
        </div>

        {/* Cost Breakdown by Node */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="cost-breakdown">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ノード別コスト内訳</h2>
          <div className="space-y-3">
            {costEstimate.costByNode
              .filter((n) => n.costUsd > 0)
              .sort((a, b) => b.costUsd - a.costUsd)
              .map((entry) => (
                <div key={entry.nodeId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.label}</span>
                      <span className="text-xs text-gray-500">
                        ${entry.costUsd.toFixed(6)} ({entry.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.max(entry.percentage, 1)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Token Optimizations */}
        {tokenOptimizations.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm" data-testid="token-optimizations">
            <h2 className="mb-4 text-lg font-semibold text-amber-900">
              トークン最適化の提案 ({tokenOptimizations.length}件)
            </h2>
            <div className="space-y-3">
              {tokenOptimizations.map((opt) => (
                <div
                  key={opt.nodeId}
                  className="rounded-lg border border-amber-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {opt.currentModelId} → {opt.suggestedModelId}
                    </span>
                    <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">
                      -{opt.savingsPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                    <span>現在: ${opt.currentCostPerExec.toFixed(6)}/回</span>
                    <span>→</span>
                    <span>提案: ${opt.suggestedCostPerExec.toFixed(6)}/回</span>
                  </div>
                  <p className="text-xs text-gray-500">{opt.tradeoff}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {costEstimate.recommendations.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="cost-recommendations">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">推奨事項</h2>
            <div className="space-y-2">
              {costEstimate.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                  <span className="text-blue-500 mt-0.5">&#9432;</span>
                  <p className="text-sm text-blue-800">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Parameters Reference */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="cost-parameters">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">料金単価テーブル</h2>
            <button
              onClick={() => setShowPricing(!showPricing)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showPricing ? '非表示' : '表示する'}
            </button>
          </div>
          {showPricing && (
            <div className="space-y-6">
              {costCategories.map((cat) => (
                <div key={cat.category}>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">{cat.label}</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">項目</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">単位</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">USD</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">JPY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.parameters.map((param) => (
                          <tr key={param.id} className="border-t border-gray-100">
                            <td className="px-3 py-2">
                              <p className="font-medium text-gray-900">{param.name}</p>
                              <p className="text-xs text-gray-400">{param.description}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{param.unit}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-900">
                              ${param.unitCostUsd}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-900">
                              {param.unitCostJpy}円
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 text-right">
                為替レート: 1 USD = {USD_TO_JPY_RATE}円
              </p>
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}
