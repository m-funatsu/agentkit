import type { Agent, AgentExecution, WorkflowStep } from '@/types';

const STEP_TYPE_LABELS: Record<WorkflowStep['type'], string> = {
  trigger: 'トリガー',
  ai_decision: 'AI判断',
  action: 'アクション',
  condition: '条件分岐',
};

const AI_DECISION_SAMPLES = [
  'クライアントの過去の取引履歴を分析し、最適な対応方針を決定しました。',
  '受信内容の緊急度を「中」と判定し、通常フローで処理を続行します。',
  'テンプレートに基づいてドラフトを作成しました。敬語レベルを調整済みです。',
  'データを集計し、要約レポートを生成しました。異常値は検出されませんでした。',
  '条件を評価し、TRUEブランチ（即時対応）を選択しました。',
  'スケジュール情報を抽出し、カレンダーに登録する内容を整理しました。',
];

export function simulateExecution(agent: Agent): AgentExecution {
  const now = new Date();
  const totalSteps = agent.steps.length;
  const shouldFail = Math.random() < 0.15;
  const failAtStep = shouldFail ? Math.floor(Math.random() * totalSteps) : -1;

  const stepsCompleted = shouldFail ? failAtStep + 1 : totalSteps;
  const executionTimeMs = totalSteps * (800 + Math.floor(Math.random() * 1200));

  const aiDecisions: string[] = [];
  for (const step of agent.steps.toSorted((a, b) => a.order - b.order)) {
    if (step.order > stepsCompleted - 1) break;
    if (step.type === 'ai_decision') {
      const sample = AI_DECISION_SAMPLES[Math.floor(Math.random() * AI_DECISION_SAMPLES.length)];
      aiDecisions.push(`[${step.label}] ${sample}`);
    } else if (step.type === 'condition') {
      aiDecisions.push(`[${step.label}] 条件「${step.config.condition ?? '未定義'}」を評価 → ${Math.random() > 0.5 ? 'TRUE' : 'FALSE'}`);
    }
  }

  const triggerConfig = agent.steps.find(s => s.type === 'trigger')?.config;
  const triggerType = (triggerConfig?.triggerType ?? 'manual') as AgentExecution['triggerType'];

  const completedAt = shouldFail
    ? new Date(now.getTime() + executionTimeMs).toISOString()
    : new Date(now.getTime() + executionTimeMs).toISOString();

  return {
    id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agentId: agent.id,
    agentName: agent.name,
    triggerType,
    status: shouldFail ? 'failed' : 'completed',
    stepsCompleted,
    totalSteps,
    aiDecisions,
    startedAt: now.toISOString(),
    completedAt,
    executionTimeMs,
    errorMessage: shouldFail ? `ステップ${failAtStep + 1}「${agent.steps[failAtStep]?.label ?? '不明'}」(${STEP_TYPE_LABELS[agent.steps[failAtStep]?.type ?? 'action']})の実行中にエラーが発生しました。` : undefined,
  };
}
