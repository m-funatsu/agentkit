import type { Agent, AgentExecution } from '@/types';

const PREFIX = 'agentkit_v1_';
const KEYS = { agents: `${PREFIX}agents`, executions: `${PREFIX}executions` } as const;

let agentsCache: Agent[] | null = null;
let executionsCache: AgentExecution[] | null = null;

function isBrowser(): boolean { return typeof window !== 'undefined'; }

function readRaw<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeRaw<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function getAgents(): Agent[] {
  if (agentsCache) return agentsCache;
  const stored = readRaw<Agent[]>(KEYS.agents);
  agentsCache = stored ?? [];
  return agentsCache;
}

export function getAgent(id: string): Agent | undefined {
  return getAgents().find((a) => a.id === id);
}

export function saveAgent(agent: Agent): void {
  const agents = getAgents();
  const idx = agents.findIndex((a) => a.id === agent.id);
  const now = new Date().toISOString();
  const updated = idx >= 0
    ? agents.map((a) => (a.id === agent.id ? { ...agent, updatedAt: now } : a))
    : [...agents, { ...agent, createdAt: agent.createdAt || now, updatedAt: now }];
  writeRaw(KEYS.agents, updated);
  agentsCache = updated;
}

export function deleteAgent(id: string): void {
  const agents = getAgents().filter((a) => a.id !== id);
  writeRaw(KEYS.agents, agents);
  agentsCache = agents;
}

export function updateAgentStatus(id: string, status: Agent['status']): void {
  const agent = getAgent(id);
  if (!agent) return;
  saveAgent({ ...agent, status });
}

export function getExecutions(): AgentExecution[] {
  if (executionsCache) return executionsCache;
  const stored = readRaw<AgentExecution[]>(KEYS.executions);
  executionsCache = stored ?? [];
  return executionsCache;
}

export function saveExecution(execution: AgentExecution): void {
  const executions = [...getExecutions(), execution];
  writeRaw(KEYS.executions, executions);
  executionsCache = executions;
}

export function getExecutionsForAgent(agentId: string): AgentExecution[] {
  return getExecutions().filter((e) => e.agentId === agentId);
}

export function seedDemoData(): void {
  if (!isBrowser()) return;
  const agents = getAgents();
  if (agents.length > 0) return;
  const now = new Date().toISOString();
  const demoAgents: Agent[] = [
    {
      id: 'agent_demo_1', name: 'クライアントオンボーディング',
      description: '新規クライアント登録時にウェルカムメールを自動送信',
      templateId: 'tpl_client_onboarding',
      steps: [
        { id: 's1', order: 0, type: 'trigger', label: '手動トリガー', config: { triggerType: 'manual' } },
        { id: 's2', order: 1, type: 'ai_decision', label: 'ウェルカムメール作成', config: { prompt: 'ウェルカムメールを作成' } },
        { id: 's3', order: 2, type: 'action', label: 'メール送信', config: { actionType: 'send_email' } },
      ],
      aiBrainConfig: '丁寧でプロフェッショナルな日本語でクライアントに対応してください。',
      status: 'active', icon: '🤝', color: '#6366f1', executionCount: 2, createdAt: now, updatedAt: now,
    },
    {
      id: 'agent_demo_2', name: '請求リマインダー',
      description: '月末に未払い請求書のリマインダーを自動送信',
      templateId: 'tpl_invoice_reminder',
      steps: [
        { id: 's1', order: 0, type: 'trigger', label: '月末スケジュール', config: { triggerType: 'schedule' } },
        { id: 's2', order: 1, type: 'ai_decision', label: '未払い確認', config: { prompt: '未払い請求書を確認' } },
        { id: 's3', order: 2, type: 'action', label: 'リマインダー送信', config: { actionType: 'send_email' } },
      ],
      aiBrainConfig: '丁寧だが明確な日本語で催促してください。',
      status: 'active', icon: '💰', color: '#f59e0b', executionCount: 2, createdAt: now, updatedAt: now,
    },
    {
      id: 'agent_demo_3', name: 'プロジェクト進捗レポート',
      description: '毎週のプロジェクト進捗をクライアントに自動報告',
      templateId: 'tpl_project_report',
      steps: [
        { id: 's1', order: 0, type: 'trigger', label: '週次スケジュール', config: { triggerType: 'schedule' } },
        { id: 's2', order: 1, type: 'ai_decision', label: '進捗要約作成', config: { prompt: '進捗レポートを作成' } },
        { id: 's3', order: 2, type: 'action', label: 'レポート送信', config: { actionType: 'send_email' } },
      ],
      aiBrainConfig: '簡潔で分かりやすい日本語でレポートを作成してください。',
      status: 'paused', icon: '📊', color: '#10b981', executionCount: 1, createdAt: now, updatedAt: now,
    },
  ];
  const demoExecs: AgentExecution[] = [
    { id: 'exec_1', agentId: 'agent_demo_1', agentName: 'クライアントオンボーディング', triggerType: 'manual', status: 'completed', stepsCompleted: 3, totalSteps: 3, aiDecisions: ['ウェルカムメールのドラフトを作成しました。'], startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3597000).toISOString(), executionTimeMs: 3000 },
    { id: 'exec_2', agentId: 'agent_demo_2', agentName: '請求リマインダー', triggerType: 'schedule', status: 'completed', stepsCompleted: 3, totalSteps: 3, aiDecisions: ['未払い請求書3件を検出。'], startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86395000).toISOString(), executionTimeMs: 5000 },
    { id: 'exec_3', agentId: 'agent_demo_1', agentName: 'クライアントオンボーディング', triggerType: 'manual', status: 'failed', stepsCompleted: 1, totalSteps: 3, aiDecisions: ['メール作成中にエラーが発生。'], startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7198000).toISOString(), executionTimeMs: 2000, errorMessage: 'メールサービスへの接続に失敗しました。' },
    { id: 'exec_4', agentId: 'agent_demo_2', agentName: '請求リマインダー', triggerType: 'schedule', status: 'awaiting_approval', stepsCompleted: 2, totalSteps: 3, aiDecisions: ['高額請求のため承認が必要です。'], startedAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'exec_5', agentId: 'agent_demo_3', agentName: 'プロジェクト進捗レポート', triggerType: 'schedule', status: 'completed', stepsCompleted: 3, totalSteps: 3, aiDecisions: ['今週の進捗率80%。課題なし。'], startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172795000).toISOString(), executionTimeMs: 5000 },
  ];
  for (const agent of demoAgents) { saveAgent(agent); }
  for (const exec of demoExecs) { saveExecution(exec); }
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function invalidateCache(): void {
  agentsCache = null;
  executionsCache = null;
}
