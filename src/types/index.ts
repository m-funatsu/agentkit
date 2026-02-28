export interface Agent {
  id: string;
  name: string;
  description: string;
  templateId?: string;
  steps: WorkflowStep[];
  aiBrainConfig: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  icon: string;
  color: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'ai_decision' | 'action' | 'condition';
  label: string;
  config: Record<string, string>;
  order: number;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'client_management' | 'billing' | 'project_management' | 'scheduling' | 'communication' | 'content';
  steps: WorkflowStep[];
  aiBrainConfig: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  icon: string;
  color: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  agentName: string;
  triggerType: 'schedule' | 'webhook' | 'email' | 'manual';
  status: 'running' | 'completed' | 'failed' | 'awaiting_approval';
  stepsCompleted: number;
  totalSteps: number;
  aiDecisions: string[];
  startedAt: string;
  completedAt?: string;
  executionTimeMs?: number;
  errorMessage?: string;
}
