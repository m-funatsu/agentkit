'use client';

import { useState, useMemo } from 'react';
import {
  WORKFLOW_TEMPLATES,
  getNodeById,
  type WorkflowTemplate,
} from '@/data/master-data';
import {
  generateAdvisory,
  validateWorkflow,
  generateCodeExport,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type AdvisoryReport,
  type AdvisoryCategory,
  type ValidationResult,
  type CodeExport,
} from '@/lib/logic';
import Navigation from '@/components/Navigation';

const GRADE_RING_COLORS: Record<AdvisoryReport['overallGrade'], { ring: string; bg: string; text: string }> = {
  A: { ring: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
  B: { ring: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  C: { ring: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  D: { ring: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-800' },
  F: { ring: 'border-red-500', bg: 'bg-red-50', text: 'text-red-800' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'ワークフロー効率': '🔄',
  'コスト最適化': '💰',
  'エラーハンドリング': '🛡️',
  'スケーラビリティ': '📊',
  'セキュリティ': '🔒',
};

const VALIDATION_SEVERITY_STYLES: Record<string, string> = {
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const VALIDATION_SEVERITY_LABELS: Record<string, string> = {
  error: 'エラー',
  warning: '警告',
  info: '情報',
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

function ScoreGauge({ score, grade }: { score: number; grade: AdvisoryCategory['grade'] }) {
  const colors = GRADE_RING_COLORS[grade];
  return (
    <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-4 ${colors.ring} ${colors.bg}`}>
      <span className={`text-lg font-extrabold ${colors.text}`}>{score}</span>
    </div>
  );
}

export default function AdvisoryPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(WORKFLOW_TEMPLATES[0].id);
  const [showCode, setShowCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<'typescript' | 'python'>('typescript');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => WORKFLOW_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? WORKFLOW_TEMPLATES[0],
    [selectedTemplateId]
  );

  const workflow = useMemo(() => buildWorkflowFromTemplate(selectedTemplate), [selectedTemplate]);

  const advisory: AdvisoryReport = useMemo(() => generateAdvisory(workflow), [workflow]);

  const validation: ValidationResult = useMemo(
    () => validateWorkflow(workflow.nodes, workflow.edges),
    [workflow]
  );

  const codeExport: CodeExport = useMemo(
    () => generateCodeExport(workflow, codeLanguage),
    [workflow, codeLanguage]
  );

  const overallColors = GRADE_RING_COLORS[advisory.overallGrade];

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="advisory-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">アドバイザリーレポート</h1>
          <p className="text-sm text-gray-500">
            ワークフローの総合診断 - 効率・コスト・信頼性・セキュリティを多角的に評価
          </p>
        </div>

        {/* Template Selection */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="advisory-template-selector">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">診断対象ワークフロー</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedTemplateId(tmpl.id);
                  setExpandedCategory(null);
                }}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selectedTemplateId === tmpl.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{tmpl.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tmpl.name}</p>
                  <p className="text-xs text-gray-500">
                    {tmpl.nodeSequence.length}ノード | {tmpl.difficulty === 'beginner' ? '初級' : tmpl.difficulty === 'intermediate' ? '中級' : '上級'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Overall Score */}
        <div className={`mb-6 rounded-xl border-2 p-6 shadow-sm ${overallColors.ring} ${overallColors.bg}`} data-testid="advisory-overall-score">
          <div className="flex items-center gap-6">
            <div className={`flex h-24 w-24 items-center justify-center rounded-2xl border-4 bg-white ${overallColors.ring}`}>
              <div className="text-center">
                <p className={`text-3xl font-extrabold ${overallColors.text}`}>{advisory.overallGrade}</p>
                <p className="text-xs text-gray-500">{advisory.overallScore}点</p>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{advisory.workflowName}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {advisory.categories.length}カテゴリの総合評価
              </p>
              <p className="text-xs text-gray-400 mt-1">
                診断日時: {new Date(advisory.timestamp).toLocaleString('ja-JP')}
              </p>
            </div>
          </div>
        </div>

        {/* Category Scores Overview */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="category-scores">
          {advisory.categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
              className={`rounded-xl border p-4 text-center transition-all ${
                expandedCategory === cat.category
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl">{CATEGORY_ICONS[cat.category] ?? '📋'}</span>
              <p className="mt-1 text-xs font-medium text-gray-600">{cat.category}</p>
              <div className="mt-2 flex items-center justify-center gap-1">
                <span className={`text-lg font-bold ${GRADE_RING_COLORS[cat.grade].text}`}>
                  {cat.grade}
                </span>
                <span className="text-xs text-gray-400">{cat.score}点</span>
              </div>
            </button>
          ))}
        </div>

        {/* Category Details */}
        <div className="mb-6 space-y-4" data-testid="category-details">
          {advisory.categories
            .filter((cat) => expandedCategory === null || expandedCategory === cat.category)
            .map((cat) => (
              <div
                key={cat.category}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <ScoreGauge score={cat.score} grade={cat.grade} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {CATEGORY_ICONS[cat.category] ?? '📋'} {cat.category}
                    </h3>
                    <p className="text-sm text-gray-500">
                      検出事項: {cat.findings.length}件 | 推奨事項: {cat.recommendations.length}件
                    </p>
                  </div>
                </div>

                {/* Findings */}
                {cat.findings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">検出事項</h4>
                    <div className="space-y-1">
                      {cat.findings.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5">&#8226;</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {cat.recommendations.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-700">推奨アクション</h4>
                    <div className="space-y-2">
                      {cat.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-blue-50 p-3"
                        >
                          <span className="text-blue-500 mt-0.5">&#9432;</span>
                          <p className="text-sm text-blue-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Validation Results */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="validation-section">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            バリデーション結果
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${validation.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {validation.valid ? '有効' : '無効'}
            </span>
          </h2>

          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.totalNodes}</p>
              <p className="text-xs text-gray-500">ノード数</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.totalEdges}</p>
              <p className="text-xs text-gray-500">エッジ数</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.triggerCount}</p>
              <p className="text-xs text-gray-500">トリガー</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.llmCount}</p>
              <p className="text-xs text-gray-500">LLM</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.outputCount}</p>
              <p className="text-xs text-gray-500">出力</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-lg font-bold text-gray-900">{validation.stats.maxDepth}</p>
              <p className="text-xs text-gray-500">最大深度</p>
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="space-y-2">
              {validation.issues.map((issue, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${VALIDATION_SEVERITY_STYLES[issue.severity]}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase">
                      {VALIDATION_SEVERITY_LABELS[issue.severity]}
                    </span>
                    <span className="text-xs opacity-60">[{issue.code}]</span>
                  </div>
                  <p className="text-sm">{issue.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code Export */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="code-export-section">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">コードエクスポート</h2>
            <div className="flex items-center gap-2">
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value as 'typescript' | 'python')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700"
              >
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
              <button
                onClick={() => setShowCode(!showCode)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                {showCode ? 'コードを非表示' : 'コードを表示'}
              </button>
            </div>
          </div>

          {showCode && (
            <div>
              <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
                <span>ファイル名: {codeExport.filename}</span>
                {codeExport.dependencies.length > 0 && (
                  <span>依存パッケージ: {codeExport.dependencies.join(', ')}</span>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg bg-gray-900 p-4">
                <pre className="text-xs text-gray-100 leading-relaxed">
                  <code>{codeExport.code}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
      <Navigation />
    </div>
  );
}
