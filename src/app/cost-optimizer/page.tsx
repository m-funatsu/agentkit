'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkflowStep {
  id: string;
  name: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  callsPerRun: number;
  isCritical: boolean;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  runsPerDay: number;
  successRate: number;
  createdAt: number;
}

interface ModelInfo {
  id: string;
  name: string;
  inputPricePer1K: number;
  outputPricePer1K: number;
  tier: 'premium' | 'standard' | 'economy';
  maxContext: number;
}

interface StepCost {
  step: WorkflowStep;
  model: ModelInfo;
  costPerCall: number;
  costPerRun: number;
  monthlyCallCost: number;
  tokenWasteRatio: number;
}

interface WorkflowCost {
  workflow: Workflow;
  stepCosts: StepCost[];
  costPerRun: number;
  costPerSuccess: number;
  monthlyCost: number;
  tokenWasteRatio: number;
}

interface DowngradeSuggestion {
  step: WorkflowStep;
  currentModel: ModelInfo;
  suggestedModel: ModelInfo;
  currentMonthlyCost: number;
  suggestedMonthlyCost: number;
  savings: number;
  savingsPercent: number;
}

interface CostProjection {
  month: number;
  label: string;
  baseCost: number;
  discountedCost: number;
  cumulativeBase: number;
  cumulativeDiscounted: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'agentkit-cost-optimizer';

const MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', inputPricePer1K: 0.005, outputPricePer1K: 0.015, tier: 'premium', maxContext: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', inputPricePer1K: 0.00015, outputPricePer1K: 0.0006, tier: 'economy', maxContext: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', inputPricePer1K: 0.01, outputPricePer1K: 0.03, tier: 'premium', maxContext: 128000 },
  { id: 'claude-opus', name: 'Claude Opus 4', inputPricePer1K: 0.015, outputPricePer1K: 0.075, tier: 'premium', maxContext: 200000 },
  { id: 'claude-sonnet', name: 'Claude Sonnet 4', inputPricePer1K: 0.003, outputPricePer1K: 0.015, tier: 'standard', maxContext: 200000 },
  { id: 'claude-haiku', name: 'Claude Haiku 3.5', inputPricePer1K: 0.0008, outputPricePer1K: 0.004, tier: 'economy', maxContext: 200000 },
  { id: 'gemini-2-pro', name: 'Gemini 2.0 Pro', inputPricePer1K: 0.00125, outputPricePer1K: 0.005, tier: 'standard', maxContext: 1000000 },
  { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', inputPricePer1K: 0.0001, outputPricePer1K: 0.0004, tier: 'economy', maxContext: 1000000 },
  { id: 'deepseek-v3', name: 'DeepSeek V3', inputPricePer1K: 0.00027, outputPricePer1K: 0.0011, tier: 'economy', maxContext: 128000 },
  { id: 'llama-3-70b', name: 'Llama 3.3 70B', inputPricePer1K: 0.0008, outputPricePer1K: 0.0008, tier: 'standard', maxContext: 128000 },
];

const VOLUME_DISCOUNTS = [
  { threshold: 0, discount: 0 },
  { threshold: 50000, discount: 0.05 },
  { threshold: 200000, discount: 0.10 },
  { threshold: 500000, discount: 0.15 },
  { threshold: 1000000, discount: 0.20 },
];

const USD_TO_JPY = 150;

// ── Calculation Logic ──────────────────────────────────────────────────────────

function getModel(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) || MODELS[0];
}

function calculateStepCost(step: WorkflowStep, runsPerDay: number): StepCost {
  const model = getModel(step.modelId);
  const inputCost = (step.inputTokens / 1000) * model.inputPricePer1K;
  const outputCost = (step.outputTokens / 1000) * model.outputPricePer1K;
  const costPerCall = inputCost + outputCost;
  const costPerRun = costPerCall * step.callsPerRun;
  const monthlyCallCost = costPerRun * runsPerDay * 30;

  // Token waste ratio: estimate based on context utilization
  const totalTokens = step.inputTokens + step.outputTokens;
  const contextUsage = totalTokens / model.maxContext;
  // Waste = unused context window that still incurs overhead
  const tokenWasteRatio = contextUsage < 0.1 ? 0.3 : contextUsage < 0.3 ? 0.15 : 0.05;

  return {
    step,
    model,
    costPerCall,
    costPerRun,
    monthlyCallCost,
    tokenWasteRatio,
  };
}

function calculateWorkflowCost(workflow: Workflow): WorkflowCost {
  const stepCosts = workflow.steps.map((s) =>
    calculateStepCost(s, workflow.runsPerDay)
  );

  const costPerRun = stepCosts.reduce((s, sc) => s + sc.costPerRun, 0);
  const monthlyCost = stepCosts.reduce((s, sc) => s + sc.monthlyCallCost, 0);
  const costPerSuccess =
    workflow.successRate > 0 ? costPerRun / (workflow.successRate / 100) : costPerRun;

  const totalTokenWaste = stepCosts.length > 0
    ? stepCosts.reduce((s, sc) => s + sc.tokenWasteRatio, 0) / stepCosts.length
    : 0;

  return {
    workflow,
    stepCosts,
    costPerRun,
    costPerSuccess,
    monthlyCost,
    tokenWasteRatio: totalTokenWaste,
  };
}

function suggestDowngrades(workflow: Workflow): DowngradeSuggestion[] {
  const suggestions: DowngradeSuggestion[] = [];

  for (const step of workflow.steps) {
    if (step.isCritical) continue;

    const currentModel = getModel(step.modelId);
    const currentCost = calculateStepCost(step, workflow.runsPerDay);

    // Find cheaper models in same or lower tier
    const alternatives = MODELS.filter(
      (m) =>
        m.id !== currentModel.id &&
        (m.inputPricePer1K + m.outputPricePer1K) <
          (currentModel.inputPricePer1K + currentModel.outputPricePer1K) &&
        m.maxContext >= step.inputTokens + step.outputTokens
    ).sort(
      (a, b) =>
        a.inputPricePer1K + a.outputPricePer1K - (b.inputPricePer1K + b.outputPricePer1K)
    );

    if (alternatives.length > 0) {
      const suggested = alternatives[0];
      const suggestedStep = { ...step, modelId: suggested.id };
      const suggestedCost = calculateStepCost(suggestedStep, workflow.runsPerDay);

      const savings = currentCost.monthlyCallCost - suggestedCost.monthlyCallCost;
      const savingsPercent =
        currentCost.monthlyCallCost > 0
          ? (savings / currentCost.monthlyCallCost) * 100
          : 0;

      if (savings > 0) {
        suggestions.push({
          step,
          currentModel,
          suggestedModel: suggested,
          currentMonthlyCost: currentCost.monthlyCallCost,
          suggestedMonthlyCost: suggestedCost.monthlyCallCost,
          savings,
          savingsPercent,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.savings - a.savings);
}

function projectCosts(
  monthlyCost: number,
  months: number
): CostProjection[] {
  const projections: CostProjection[] = [];
  let cumulativeBase = 0;
  let cumulativeDiscounted = 0;

  for (let i = 1; i <= months; i++) {
    // Apply volume discount based on cumulative spend
    const annualProjection = monthlyCost * 12 * USD_TO_JPY;
    let discount = 0;
    for (let d = VOLUME_DISCOUNTS.length - 1; d >= 0; d--) {
      if (annualProjection >= VOLUME_DISCOUNTS[d].threshold) {
        discount = VOLUME_DISCOUNTS[d].discount;
        break;
      }
    }

    // Growth factor: assume 5% monthly volume increase
    const growthFactor = Math.pow(1.05, i - 1);
    const baseCost = monthlyCost * growthFactor;
    const discountedCost = baseCost * (1 - discount);

    cumulativeBase += baseCost;
    cumulativeDiscounted += discountedCost;

    projections.push({
      month: i,
      label: `${i}ヶ月`,
      baseCost,
      discountedCost,
      cumulativeBase,
      cumulativeDiscounted,
    });
  }

  return projections;
}

// ── SVG Components ─────────────────────────────────────────────────────────────

function ModelComparisonChart({ workflowCosts }: { workflowCosts: WorkflowCost[] }) {
  if (workflowCosts.length === 0) return null;

  // Group costs by model
  const modelCosts: Record<string, number> = {};
  for (const wc of workflowCosts) {
    for (const sc of wc.stepCosts) {
      const name = sc.model.name;
      modelCosts[name] = (modelCosts[name] || 0) + sc.monthlyCallCost;
    }
  }

  const entries = Object.entries(modelCosts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const width = 500;
  const barHeight = 28;
  const padding = { top: 10, right: 80, bottom: 10, left: 140 };
  const height = entries.length * (barHeight + 8) + padding.top + padding.bottom;
  const maxCost = Math.max(...entries.map(([, c]) => c), 0.001);

  const colors: Record<string, string> = {
    premium: '#ef4444',
    standard: '#eab308',
    economy: '#22c55e',
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 400 }}>
      {entries.map(([name, cost], i) => {
        const y = padding.top + i * (barHeight + 8);
        const barW = (cost / maxCost) * (width - padding.left - padding.right);
        const model = MODELS.find((m) => m.name === name);
        const color = model ? colors[model.tier] || '#6b7280' : '#6b7280';
        const displayName = name.length > 16 ? name.substring(0, 16) + '...' : name;

        return (
          <g key={name}>
            <text
              x={padding.left - 8}
              y={y + barHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#d1d5db"
              fontSize="10"
            >
              {displayName}
            </text>
            <rect
              x={padding.left}
              y={y}
              width={Math.max(2, barW)}
              height={barHeight}
              rx="4"
              fill={color}
              opacity={0.8}
            />
            <text
              x={padding.left + barW + 6}
              y={y + barHeight / 2}
              dominantBaseline="middle"
              fill="#d1d5db"
              fontSize="10"
            >
              ${cost.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CostProjectionChart({ projections }: { projections: CostProjection[] }) {
  if (projections.length === 0) return null;

  const width = 560;
  const height = 280;
  const padding = { top: 30, right: 40, bottom: 40, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...projections.map((p) => Math.max(p.cumulativeBase, p.cumulativeDiscounted)),
    0.001
  );

  function getX(i: number): number {
    return padding.left + (i / (projections.length - 1 || 1)) * chartW;
  }

  function getY(val: number): number {
    return padding.top + chartH - (val / maxVal) * chartH;
  }

  const basePath = projections
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p.cumulativeBase)}`)
    .join(' ');

  const discountPath = projections
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p.cumulativeDiscounted)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding.top + (i / 4) * chartH;
        const val = maxVal * (1 - i / 4);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1f2937" strokeWidth="1" />
            <text x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#6b7280" fontSize="9">
              ${val.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* X axis labels */}
      {projections.filter((_, i) => i % 3 === 0 || i === projections.length - 1).map((p, _idx, arr) => {
        const i = projections.indexOf(p);
        return (
          <text
            key={i}
            x={getX(i)}
            y={height - padding.bottom + 16}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="9"
          >
            {p.label}
          </text>
        );
      })}

      {/* Lines */}
      <path d={basePath} fill="none" stroke="#ef4444" strokeWidth="2" />
      <path d={discountPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5,3" />

      {/* Data points */}
      {projections.map((p, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(p.cumulativeBase)} r="3" fill="#ef4444" />
          <circle cx={getX(i)} cy={getY(p.cumulativeDiscounted)} r="3" fill="#22c55e" />
        </g>
      ))}

      {/* Legend */}
      <line x1={padding.left} y1={12} x2={padding.left + 20} y2={12} stroke="#ef4444" strokeWidth="2" />
      <text x={padding.left + 24} y={16} fill="#d1d5db" fontSize="10">通常コスト</text>
      <line x1={padding.left + 100} y1={12} x2={padding.left + 120} y2={12} stroke="#22c55e" strokeWidth="2" strokeDasharray="5,3" />
      <text x={padding.left + 124} y={16} fill="#d1d5db" fontSize="10">割引後コスト</text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CostOptimizerPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showAddWorkflow, setShowAddWorkflow] = useState(false);
  const [showAddStep, setShowAddStep] = useState<string | null>(null);
  const [projectionMonths, setProjectionMonths] = useState(12);

  // Workflow form
  const [wfName, setWfName] = useState('');
  const [wfRuns, setWfRuns] = useState('');
  const [wfSuccess, setWfSuccess] = useState('95');

  // Step form
  const [stepName, setStepName] = useState('');
  const [stepModel, setStepModel] = useState(MODELS[0].id);
  const [stepInput, setStepInput] = useState('');
  const [stepOutput, setStepOutput] = useState('');
  const [stepCalls, setStepCalls] = useState('1');
  const [stepCritical, setStepCritical] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWorkflows(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const save = useCallback((data: Workflow[]) => {
    setWorkflows(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, []);

  const handleAddWorkflow = useCallback(() => {
    if (!wfName.trim()) return;
    const wf: Workflow = {
      id: String(Date.now()),
      name: wfName.trim(),
      steps: [],
      runsPerDay: parseInt(wfRuns) || 10,
      successRate: parseFloat(wfSuccess) || 95,
      createdAt: Date.now(),
    };
    save([...workflows, wf]);
    setWfName('');
    setWfRuns('');
    setWfSuccess('95');
    setShowAddWorkflow(false);
  }, [wfName, wfRuns, wfSuccess, workflows, save]);

  const handleAddStep = useCallback(() => {
    if (!showAddStep || !stepName.trim()) return;
    const step: WorkflowStep = {
      id: String(Date.now()),
      name: stepName.trim(),
      modelId: stepModel,
      inputTokens: parseInt(stepInput) || 1000,
      outputTokens: parseInt(stepOutput) || 500,
      callsPerRun: parseInt(stepCalls) || 1,
      isCritical: stepCritical,
    };
    const updated = workflows.map((w) =>
      w.id === showAddStep
        ? { ...w, steps: [...w.steps, step] }
        : w
    );
    save(updated);
    setStepName('');
    setStepInput('');
    setStepOutput('');
    setStepCalls('1');
    setStepCritical(false);
    setShowAddStep(null);
  }, [
    showAddStep, stepName, stepModel, stepInput, stepOutput,
    stepCalls, stepCritical, workflows, save,
  ]);

  const handleDeleteWorkflow = useCallback(
    (id: string) => {
      save(workflows.filter((w) => w.id !== id));
    },
    [workflows, save]
  );

  const handleDeleteStep = useCallback(
    (wfId: string, stepId: string) => {
      const updated = workflows.map((w) =>
        w.id === wfId
          ? { ...w, steps: w.steps.filter((s) => s.id !== stepId) }
          : w
      );
      save(updated);
    },
    [workflows, save]
  );

  const allWorkflowCosts = useMemo(
    () => workflows.map(calculateWorkflowCost),
    [workflows]
  );

  const totalMonthlyCost = useMemo(
    () => allWorkflowCosts.reduce((s, wc) => s + wc.monthlyCost, 0),
    [allWorkflowCosts]
  );

  const allSuggestions = useMemo(
    () => workflows.flatMap(suggestDowngrades),
    [workflows]
  );

  const totalPotentialSavings = useMemo(
    () => allSuggestions.reduce((s, sg) => s + sg.savings, 0),
    [allSuggestions]
  );

  const projections = useMemo(
    () => projectCosts(totalMonthlyCost, projectionMonths),
    [totalMonthlyCost, projectionMonths]
  );

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">エージェントコスト最適化</h1>
        <p className="text-gray-400 mb-6">
          AIエージェントワークフローのモデル選択とコストを最適化します
        </p>

        {/* Summary stats */}
        {workflows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{workflows.length}</div>
              <div className="text-xs text-gray-400">ワークフロー数</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                ${totalMonthlyCost.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">月間コスト</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {(totalMonthlyCost * USD_TO_JPY).toLocaleString()}円
              </div>
              <div className="text-xs text-gray-400">月間コスト（円）</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                ${totalPotentialSavings.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">最適化余地</div>
            </div>
          </div>
        )}

        {/* Add workflow */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddWorkflow(!showAddWorkflow)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm"
          >
            + ワークフローを追加
          </button>
        </div>

        {showAddWorkflow && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-sm font-semibold mb-4">新規ワークフロー</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ワークフロー名</label>
                <input
                  type="text"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="カスタマーサポート自動化"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">1日あたりの実行数</label>
                <input
                  type="number"
                  value={wfRuns}
                  onChange={(e) => setWfRuns(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">成功率（%）</label>
                <input
                  type="number"
                  value={wfSuccess}
                  onChange={(e) => setWfSuccess(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="95"
                  min="1"
                  max="100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddWorkflow}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm"
              >
                追加
              </button>
              <button
                onClick={() => setShowAddWorkflow(false)}
                className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Workflows */}
        <div className="space-y-4 mb-6">
          {workflows.map((wf) => {
            const wfCost = allWorkflowCosts.find((wc) => wc.workflow.id === wf.id);
            return (
              <div key={wf.id} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{wf.name}</h3>
                    <p className="text-xs text-gray-500">
                      {wf.runsPerDay}回/日 | 成功率{wf.successRate}% | {wf.steps.length}ステップ
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {wfCost && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-400">
                          ${wfCost.monthlyCost.toFixed(2)}/月
                        </div>
                        <div className="text-xs text-gray-500">
                          ${wfCost.costPerSuccess.toFixed(4)}/成功
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="text-gray-500 hover:text-red-400 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* Steps */}
                {wf.steps.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="text-left py-1 px-2">ステップ</th>
                          <th className="text-left py-1 px-2">モデル</th>
                          <th className="text-right py-1 px-2">入力トークン</th>
                          <th className="text-right py-1 px-2">出力トークン</th>
                          <th className="text-right py-1 px-2">コール数</th>
                          <th className="text-right py-1 px-2">月間コスト</th>
                          <th className="text-center py-1 px-2">重要</th>
                          <th className="text-right py-1 px-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wf.steps.map((step) => {
                          const sc = wfCost?.stepCosts.find((c) => c.step.id === step.id);
                          const model = getModel(step.modelId);
                          return (
                            <tr key={step.id} className="border-b border-gray-800">
                              <td className="py-1.5 px-2">{step.name}</td>
                              <td className="py-1.5 px-2">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    model.tier === 'premium'
                                      ? 'bg-red-900 text-red-300'
                                      : model.tier === 'standard'
                                      ? 'bg-yellow-900 text-yellow-300'
                                      : 'bg-green-900 text-green-300'
                                  }`}
                                >
                                  {model.name}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-400">
                                {step.inputTokens.toLocaleString()}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-400">
                                {step.outputTokens.toLocaleString()}
                              </td>
                              <td className="py-1.5 px-2 text-right text-gray-400">
                                {step.callsPerRun}
                              </td>
                              <td className="py-1.5 px-2 text-right font-bold text-blue-400">
                                ${sc ? sc.monthlyCallCost.toFixed(2) : '0.00'}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                {step.isCritical ? (
                                  <span className="text-red-400 text-xs">必須</span>
                                ) : (
                                  <span className="text-gray-600 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-right">
                                <button
                                  onClick={() => handleDeleteStep(wf.id, step.id)}
                                  className="text-gray-500 hover:text-red-400 text-xs"
                                >
                                  削除
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add step form */}
                {showAddStep === wf.id ? (
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h4 className="text-xs font-semibold mb-3">ステップを追加</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">ステップ名</label>
                        <input
                          type="text"
                          value={stepName}
                          onChange={(e) => setStepName(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="意図分類"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">モデル</label>
                        <select
                          value={stepModel}
                          onChange={(e) => setStepModel(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                        >
                          {MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (${m.inputPricePer1K}/{m.outputPricePer1K} per 1K)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">入力トークン</label>
                        <input
                          type="number"
                          value={stepInput}
                          onChange={(e) => setStepInput(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="2000"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">出力トークン</label>
                        <input
                          type="number"
                          value={stepOutput}
                          onChange={(e) => setStepOutput(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">コール回数/実行</label>
                        <input
                          type="number"
                          value={stepCalls}
                          onChange={(e) => setStepCalls(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={stepCritical}
                            onChange={(e) => setStepCritical(e.target.checked)}
                            className="rounded"
                          />
                          重要ステップ（ダウングレード対象外）
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddStep}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 text-sm"
                      >
                        追加
                      </button>
                      <button
                        onClick={() => setShowAddStep(null)}
                        className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddStep(wf.id)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    + ステップを追加
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Model comparison chart */}
        {allWorkflowCosts.some((wc) => wc.stepCosts.length > 0) && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">モデル別月間コスト比較</h2>
            <ModelComparisonChart workflowCosts={allWorkflowCosts} />
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                プレミアム
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block" />
                スタンダード
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
                エコノミー
              </span>
            </div>
          </div>
        )}

        {/* Downgrade suggestions */}
        {allSuggestions.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">モデルダウングレード提案</h2>
            <p className="text-sm text-gray-400 mb-4">
              重要でないステップのモデルをダウングレードすることで、コストを削減できます
            </p>
            <div className="space-y-3">
              {allSuggestions.map((sg, i) => (
                <div key={i} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{sg.step.name}</span>
                    <span className="text-green-400 text-sm font-bold">
                      -${sg.savings.toFixed(2)}/月 ({sg.savingsPercent.toFixed(0)}%削減)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-2 py-0.5 rounded bg-red-900 text-red-300 text-xs">
                      {sg.currentModel.name}
                    </span>
                    <span className="text-gray-500">→</span>
                    <span className="px-2 py-0.5 rounded bg-green-900 text-green-300 text-xs">
                      {sg.suggestedModel.name}
                    </span>
                    <span className="text-gray-500 ml-auto">
                      ${sg.currentMonthlyCost.toFixed(2)} → ${sg.suggestedMonthlyCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-sm text-gray-400">合計削減可能額</span>
                <span className="text-green-400 font-bold">
                  -${totalPotentialSavings.toFixed(2)}/月
                  （{(totalPotentialSavings * USD_TO_JPY).toLocaleString()}円/月）
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cost projection */}
        {totalMonthlyCost > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">コスト予測（累積）</h2>
              <div className="flex gap-2">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setProjectionMonths(m)}
                    className={`px-3 py-1 rounded text-xs ${
                      projectionMonths === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {m}ヶ月
                  </button>
                ))}
              </div>
            </div>
            <CostProjectionChart projections={projections} />
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="bg-gray-800 rounded p-3 text-center">
                <div className="text-lg font-bold text-red-400">
                  ${projections.length > 0 ? projections[projections.length - 1].cumulativeBase.toFixed(0) : '0'}
                </div>
                <div className="text-xs text-gray-400">{projectionMonths}ヶ月通常累積</div>
              </div>
              <div className="bg-gray-800 rounded p-3 text-center">
                <div className="text-lg font-bold text-green-400">
                  ${projections.length > 0 ? projections[projections.length - 1].cumulativeDiscounted.toFixed(0) : '0'}
                </div>
                <div className="text-xs text-gray-400">{projectionMonths}ヶ月割引後累積</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              * 月5%の使用量増加と、年間使用額に応じたボリュームディスカウント（5-20%）を想定
            </p>
          </div>
        )}

        {/* Volume discount tiers */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ボリュームディスカウント</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left py-2 px-3">年間使用額</th>
                  <th className="text-right py-2 px-3">割引率</th>
                </tr>
              </thead>
              <tbody>
                {VOLUME_DISCOUNTS.map((vd, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2 px-3">
                      {vd.threshold === 0
                        ? '基本料金'
                        : `${(vd.threshold / 1000).toFixed(0)}K円以上`}
                    </td>
                    <td className="py-2 px-3 text-right text-green-400">
                      {vd.discount > 0 ? `-${(vd.discount * 100).toFixed(0)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {workflows.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">ワークフローがまだありません</p>
            <p className="text-sm">
              「ワークフローを追加」からコスト最適化を始めましょう
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
