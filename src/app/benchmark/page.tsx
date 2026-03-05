'use client';

import { useState, useMemo } from 'react';
import {
  WORKFLOW_TEMPLATES,
  getNodeById,
  type WorkflowTemplate,
} from '@/data/master-data';
import {
  benchmarkPerformance,
  detectBottlenecks,
  suggestParallelization,
  calculateReliability,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type BenchmarkResult,
  type Bottleneck,
  type ParallelizationSuggestion,
  type ReliabilityResult,
} from '@/lib/logic';
import Navigation from '@/components/Navigation';

const GRADE_COLORS: Record<BenchmarkResult['grade'], string> = {
  A: 'bg-green-100 text-green-800 border-green-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  D: 'bg-orange-100 text-orange-800 border-orange-200',
  F: 'bg-red-100 text-red-800 border-red-200',
};

const BOTTLENECK_TYPE_LABELS: Record<Bottleneck['type'], string> = {
  latency: 'レイテンシ',
  cost: 'コスト',
  reliability: '信頼性',
  throughput: 'スループット',
};

const BOTTLENECK_TYPE_ICONS: Record<Bottleneck['type'], string> = {
  latency: '⏱️',
  cost: '💰',
  reliability: '🛡️',
  throughput: '📊',
};

const SEVERITY_COLORS: Record<Bottleneck['severity'], string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const SEVERITY_LABELS: Record<Bottleneck['severity'], string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '重大',
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

export default function BenchmarkPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(WORKFLOW_TEMPLATES[0].id);

  const selectedTemplate = useMemo(
    () => WORKFLOW_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? WORKFLOW_TEMPLATES[0],
    [selectedTemplateId]
  );

  const workflow = useMemo(() => buildWorkflowFromTemplate(selectedTemplate), [selectedTemplate]);

  const benchmark: BenchmarkResult = useMemo(() => benchmarkPerformance(workflow), [workflow]);
  const bottlenecks: Bottleneck[] = useMemo(() => detectBottlenecks(workflow), [workflow]);
  const parallelSuggestions: ParallelizationSuggestion[] = useMemo(() => suggestParallelization(workflow), [workflow]);
  const reliability: ReliabilityResult = useMemo(() => calculateReliability(workflow, {}), [workflow]);

  const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical' || b.severity === 'high');
  const otherBottlenecks = bottlenecks.filter((b) => b.severity === 'medium' || b.severity === 'low');

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="benchmark-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">パフォーマンスベンチマーク</h1>
          <p className="text-sm text-gray-500">
            ワークフローの速度・信頼性・ボトルネックを分析
          </p>
        </div>

        {/* Template Selection */}
        <div className="mb-6 flex flex-wrap gap-2" data-testid="benchmark-template-selector">
          {WORKFLOW_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplateId(tmpl.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                selectedTemplateId === tmpl.id
                  ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tmpl.icon}</span>
              <span>{tmpl.name}</span>
            </button>
          ))}
        </div>

        {/* Overall Grade */}
        <div className="mb-6 flex items-center gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="benchmark-grade">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-3xl font-extrabold ${GRADE_COLORS[benchmark.grade]}`}>
            {benchmark.grade}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedTemplate.nodeSequence.length}ノード構成 | {selectedTemplate.category}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="benchmark-metrics">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">P50 レイテンシ</p>
            <p className="text-xl font-bold text-gray-900">{(benchmark.p50LatencyMs / 1000).toFixed(1)}s</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">P95 レイテンシ</p>
            <p className="text-xl font-bold text-gray-900">{(benchmark.p95LatencyMs / 1000).toFixed(1)}s</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">P99 レイテンシ</p>
            <p className="text-xl font-bold text-gray-900">{(benchmark.p99LatencyMs / 1000).toFixed(1)}s</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">スループット</p>
            <p className="text-xl font-bold text-gray-900">{benchmark.throughputPerMinute}/分</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">メモリ</p>
            <p className="text-xl font-bold text-gray-900">{benchmark.memoryEstimateMb}MB</p>
          </div>
        </div>

        {/* Benchmark Details */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="benchmark-details">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">分析詳細</h2>
          <div className="space-y-2">
            {benchmark.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 mt-0.5">&#8226;</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reliability */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="reliability-section">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">信頼性分析</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">全体信頼性</p>
              <p className="text-xl font-bold text-gray-900">
                {Math.round(reliability.overallReliability * 100)}%
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">MTBF</p>
              <p className="text-xl font-bold text-gray-900">
                {reliability.mtbf.toFixed(1)}h
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">月間予測障害</p>
              <p className="text-xl font-bold text-gray-900">
                {reliability.expectedFailuresPerMonth.toFixed(1)}回
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500">同時実行上限</p>
              <p className="text-xl font-bold text-gray-900">{benchmark.concurrencyLimit}</p>
            </div>
          </div>

          {/* Weakest Link */}
          {reliability.weakestLink && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm font-medium text-red-800">
                最も脆弱なノード: {workflow.nodes.find((n) => n.id === reliability.weakestLink?.nodeId)?.label ?? reliability.weakestLink.nodeId}
              </p>
              <p className="text-xs text-red-600 mt-1">
                信頼性: {Math.round(reliability.weakestLink.reliability * 100)}%
              </p>
            </div>
          )}

          {/* Reliability Recommendations */}
          {reliability.recommendations.length > 0 && (
            <div className="space-y-2">
              {reliability.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                  <span className="text-blue-500 mt-0.5">&#9432;</span>
                  <p className="text-sm text-blue-800">{rec}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottlenecks */}
        {bottlenecks.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="bottleneck-section">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              ボトルネック検出 ({bottlenecks.length}件)
            </h2>

            {criticalBottlenecks.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-red-700">重要度: 高 / 重大</h3>
                <div className="space-y-2">
                  {criticalBottlenecks.map((bn, i) => (
                    <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{BOTTLENECK_TYPE_ICONS[bn.type]}</span>
                        <span className="text-sm font-medium text-gray-900">{bn.nodeLabel}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          {BOTTLENECK_TYPE_LABELS[bn.type]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[bn.severity]}`}>
                          {SEVERITY_LABELS[bn.severity]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{bn.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherBottlenecks.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-yellow-700">重要度: 中 / 低</h3>
                <div className="space-y-2">
                  {otherBottlenecks.map((bn, i) => (
                    <div key={i} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span>{BOTTLENECK_TYPE_ICONS[bn.type]}</span>
                        <span className="text-sm font-medium text-gray-900">{bn.nodeLabel}</span>
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                          {BOTTLENECK_TYPE_LABELS[bn.type]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[bn.severity]}`}>
                          {SEVERITY_LABELS[bn.severity]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{bn.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parallelization Suggestions */}
        {parallelSuggestions.length > 0 && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm" data-testid="parallel-section">
            <h2 className="mb-4 text-lg font-semibold text-green-900">
              並列化の提案 ({parallelSuggestions.length}件)
            </h2>
            <div className="space-y-3">
              {parallelSuggestions.map((suggestion) => (
                <div
                  key={suggestion.groupId}
                  className="rounded-lg border border-green-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      並列化グループ: {suggestion.nodeLabels.join(' + ')}
                    </span>
                    <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">
                      -{suggestion.savingsPercent}% 短縮
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>逐次実行: {suggestion.currentSequentialMs}ms</span>
                    <span>→</span>
                    <span>並列実行: {suggestion.estimatedParallelMs}ms</span>
                    <span className="text-green-600 font-medium">
                      ({suggestion.savingsMs}ms 短縮)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
}
