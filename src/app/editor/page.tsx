'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Agent, WorkflowStep } from '@/types';
import { getAgent, saveAgent, saveExecution, generateId } from '@/lib/storage';
import { AGENT_TEMPLATES } from '@/data/templates';
import { simulateExecution } from '@/lib/simulation';
import StepTypeIcon from '@/components/StepTypeIcon';
import StatusBadge from '@/components/StatusBadge';

const STEP_TYPES: { value: WorkflowStep['type']; label: string; icon: string }[] = [
  { value: 'trigger', label: 'トリガー', icon: '⚡' },
  { value: 'ai_decision', label: 'AI判断', icon: '🧠' },
  { value: 'action', label: 'アクション', icon: '▶️' },
  { value: 'condition', label: '条件分岐', icon: '🔀' },
];

const AGENT_ICONS = ['🤖', '🤝', '💰', '📊', '📝', '📅', '📨', '✍️', '🗒️', '🔄', '🧠', '⚡'];
const AGENT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'];

function createEmptyAgent(): Agent {
  return {
    id: generateId('agent'),
    name: '',
    description: '',
    steps: [
      { id: generateId('step'), order: 0, type: 'trigger', label: '手動トリガー', config: { triggerType: 'manual' } },
    ],
    aiBrainConfig: '',
    status: 'draft',
    icon: '🤖',
    color: '#6366f1',
    executionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');
  const templateId = searchParams.get('template');

  const [agent, setAgent] = useState<Agent>(() => {
    return createEmptyAgent();
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastSimulation, setLastSimulation] = useState<ReturnType<typeof simulateExecution> | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (editId) {
      const existing = getAgent(editId);
      if (existing) {
        setAgent(existing);
      }
    } else if (templateId) {
      const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setAgent((prev) => ({
          ...prev,
          name: template.name,
          description: template.description,
          templateId: template.id,
          steps: template.steps.map((s) => ({ ...s, id: generateId('step') })),
          aiBrainConfig: template.aiBrainConfig,
          icon: template.icon,
          color: template.color,
        }));
      }
    }
    setIsLoaded(true);
  }, [editId, templateId]);

  const handleSave = useCallback(() => {
    if (!agent.name.trim()) return;
    saveAgent(agent);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [agent]);

  const handleSimulate = useCallback(() => {
    if (agent.steps.length === 0) return;
    const result = simulateExecution(agent);
    saveExecution(result);
    setLastSimulation(result);
    setShowSimulation(true);
  }, [agent]);

  const addStep = useCallback((type: WorkflowStep['type']) => {
    setAgent((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: generateId('step'),
          order: prev.steps.length,
          type,
          label: type === 'trigger' ? '新しいトリガー' : type === 'ai_decision' ? '新しいAI判断' : type === 'condition' ? '新しい条件分岐' : '新しいアクション',
          config: type === 'trigger' ? { triggerType: 'manual' } : {},
        },
      ],
    }));
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setAgent((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
    }));
  }, []);

  const moveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    setAgent((prev) => {
      const steps = [...prev.steps];
      const idx = steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= steps.length) return prev;
      const temp = steps[idx];
      steps[idx] = steps[targetIdx];
      steps[targetIdx] = temp;
      return {
        ...prev,
        steps: steps.map((s, i) => ({ ...s, order: i })),
      };
    });
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setAgent((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    }));
  }, []);

  const updateStepConfig = useCallback((stepId: string, key: string, value: string) => {
    setAgent((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, config: { ...s.config, [key]: value } } : s
      ),
    }));
  }, []);

  const sortedSteps = useMemo(() => agent.steps.toSorted((a, b) => a.order - b.order), [agent.steps]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="editor-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'エージェント編集' : 'エージェント作成'}
          </h1>
          <p className="text-sm text-gray-500">ステップを追加してワークフローを構築</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulate}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            disabled={agent.steps.length === 0}
            data-testid="simulate-btn"
          >
            テスト実行
          </button>
          <button
            onClick={handleSave}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            disabled={!agent.name.trim()}
            data-testid="save-btn"
          >
            {isSaved ? '保存しました' : '保存'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Agent Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="agent-info-section">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">基本情報</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-gray-500">アイコン</label>
                <div className="flex flex-wrap gap-1">
                  {AGENT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setAgent((prev) => ({ ...prev, icon }))}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors ${
                        agent.icon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      data-testid="icon-selector"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-500">カラー</label>
                <div className="flex flex-wrap gap-1">
                  {AGENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAgent((prev) => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        agent.color === color ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid="color-selector"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="agent-name" className="mb-1 block text-sm font-medium text-gray-700">
                エージェント名 <span className="text-red-500">*</span>
              </label>
              <input
                id="agent-name"
                type="text"
                value={agent.name}
                onChange={(e) => setAgent((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="例: クライアントオンボーディング"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                data-testid="agent-name-input"
              />
            </div>
            <div>
              <label htmlFor="agent-desc" className="mb-1 block text-sm font-medium text-gray-700">
                説明
              </label>
              <input
                id="agent-desc"
                type="text"
                value={agent.description}
                onChange={(e) => setAgent((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="このエージェントの目的を説明"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                data-testid="agent-desc-input"
              />
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="workflow-section">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ワークフロー</h2>
          <div className="space-y-3">
            {sortedSteps.map((step, idx) => (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {idx > 0 ? (
                  <div className="absolute left-6 -top-3 h-3 w-0.5 bg-gray-300" />
                ) : null}
                <div
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  data-testid="workflow-step"
                >
                  <div className="flex items-start gap-3">
                    <StepTypeIcon type={step.type} size="md" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={step.type}
                          onChange={(e) => updateStep(step.id, { type: e.target.value as WorkflowStep['type'] })}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700"
                          data-testid="step-type-select"
                        >
                          {STEP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => updateStep(step.id, { label: e.target.value })}
                          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                          placeholder="ステップ名"
                          data-testid="step-label-input"
                        />
                      </div>
                      {/* Config fields based on type */}
                      {step.type === 'trigger' ? (
                        <div>
                          <select
                            value={step.config.triggerType ?? 'manual'}
                            onChange={(e) => updateStepConfig(step.id, 'triggerType', e.target.value)}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                            data-testid="trigger-type-select"
                          >
                            <option value="manual">手動実行</option>
                            <option value="schedule">スケジュール</option>
                            <option value="email">メール受信</option>
                            <option value="webhook">Webhook</option>
                          </select>
                        </div>
                      ) : null}
                      {step.type === 'ai_decision' ? (
                        <textarea
                          value={step.config.prompt ?? ''}
                          onChange={(e) => updateStepConfig(step.id, 'prompt', e.target.value)}
                          placeholder="AIへの指示を入力..."
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
                          rows={2}
                          data-testid="ai-prompt-input"
                        />
                      ) : null}
                      {step.type === 'action' ? (
                        <div className="space-y-1">
                          <select
                            value={step.config.actionType ?? 'send_email'}
                            onChange={(e) => updateStepConfig(step.id, 'actionType', e.target.value)}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                            data-testid="action-type-select"
                          >
                            <option value="send_email">メール送信</option>
                            <option value="slack_notify">Slack通知</option>
                            <option value="update_notion">Notion更新</option>
                            <option value="create_invoice">請求書作成</option>
                            <option value="calendar_add">カレンダー追加</option>
                          </select>
                          <input
                            type="text"
                            value={step.config.template ?? ''}
                            onChange={(e) => updateStepConfig(step.id, 'template', e.target.value)}
                            placeholder="テンプレート (例: {{variable}})"
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400"
                            data-testid="action-template-input"
                          />
                        </div>
                      ) : null}
                      {step.type === 'condition' ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={step.config.condition ?? ''}
                            onChange={(e) => updateStepConfig(step.id, 'condition', e.target.value)}
                            placeholder="条件 (例: 緊急度が「高」の場合)"
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400"
                            data-testid="condition-input"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={step.config.trueBranch ?? ''}
                              onChange={(e) => updateStepConfig(step.id, 'trueBranch', e.target.value)}
                              placeholder="TRUE分岐"
                              className="w-1/2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              value={step.config.falseBranch ?? ''}
                              onChange={(e) => updateStepConfig(step.id, 'falseBranch', e.target.value)}
                              placeholder="FALSE分岐"
                              className="w-1/2 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 placeholder:text-gray-400"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveStep(step.id, 'up')}
                        disabled={idx === 0}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                        data-testid="move-up-btn"
                        aria-label="上へ移動"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveStep(step.id, 'down')}
                        disabled={idx === sortedSteps.length - 1}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30"
                        data-testid="move-down-btn"
                        aria-label="下へ移動"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        data-testid="remove-step-btn"
                        aria-label="ステップ削除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Add Step Buttons */}
          <div className="mt-4 flex flex-wrap gap-2" data-testid="add-step-buttons">
            {STEP_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => addStep(t.value)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                data-testid={`add-${t.value}-btn`}
              >
                {t.icon} {t.label}を追加
              </button>
            ))}
          </div>
        </div>

        {/* AI Brain Config */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="ai-brain-section">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">AIブレイン設定</h2>
          <p className="mb-4 text-sm text-gray-500">
            自然言語でエージェントの振る舞いを定義してください
          </p>
          <textarea
            value={agent.aiBrainConfig}
            onChange={(e) => setAgent((prev) => ({ ...prev, aiBrainConfig: e.target.value }))}
            placeholder="例: 丁寧な日本語でクライアントに進捗報告して。常に敬語を使い、数値データを含めてください。"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={4}
            data-testid="ai-brain-input"
          />
        </div>

        {/* Simulation Result */}
        {showSimulation && lastSimulation ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="simulation-result">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">テスト実行結果</h2>
              <StatusBadge status={lastSimulation.status} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>ステップ: {lastSimulation.stepsCompleted}/{lastSimulation.totalSteps}</span>
                <span>実行時間: {lastSimulation.executionTimeMs}ms</span>
                <span>トリガー: {lastSimulation.triggerType}</span>
              </div>
              {lastSimulation.aiDecisions.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-700">AI判断ログ:</h3>
                  <div className="space-y-1">
                    {lastSimulation.aiDecisions.map((decision, i) => (
                      <div
                        key={i}
                        className="rounded-md bg-purple-50 px-3 py-2 text-xs text-purple-800"
                        data-testid="ai-decision-log"
                      >
                        {decision}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {lastSimulation.errorMessage ? (
                <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="simulation-error">
                  {lastSimulation.errorMessage}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>}>
      <EditorContent />
    </Suspense>
  );
}
