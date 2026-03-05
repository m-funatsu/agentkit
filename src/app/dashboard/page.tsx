'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import AgentCard from '@/components/AgentCard';
import StatCard from '@/components/StatCard';
import { getAgents, saveAgent } from '@/lib/storage';
import type { Agent } from '@/types';
import { ExportButton } from '@/components/shared/ExportButton';

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(() => []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAgents(getAgents());
    setMounted(true);
  }, []);

  const toggleStatus = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    const newStatus: Agent['status'] = agent.status === 'active' ? 'paused' : 'active';
    const updated: Agent = { ...agent, status: newStatus, updatedAt: new Date().toISOString() };
    saveAgent(updated);
    setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const totalExecutions = agents.reduce((sum, a) => sum + a.executionCount, 0);
  const errorCount = agents.filter((a) => a.status === 'error').length;

  const exportData = useMemo(() =>
    agents.map((a) => ({
      name: a.name,
      description: a.description,
      status: a.status,
      stepsCount: a.steps.length,
      executionCount: a.executionCount,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    [agents]
  );

  const exportColumns = [
    { key: 'name', label: 'エージェント名' },
    { key: 'description', label: '説明' },
    { key: 'status', label: 'ステータス' },
    { key: 'stepsCount', label: 'ステップ数' },
    { key: 'executionCount', label: '実行回数' },
    { key: 'createdAt', label: '作成日', format: (v: unknown) => new Date(String(v)).toLocaleDateString('ja-JP') },
    { key: 'updatedAt', label: '更新日', format: (v: unknown) => new Date(String(v)).toLocaleDateString('ja-JP') },
  ];

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="dashboard-page">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <ExportButton
            data={exportData}
            columns={exportColumns}
            filename="agentkit_agents"
          />
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="稼働中" value={activeCount} icon="🟢" color="#10B981" />
          <StatCard label="実行回数" value={totalExecutions} icon="⚡" color="#3B82F6" />
          <StatCard label="エラー" value={errorCount} icon="🔴" color="#EF4444" />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">エージェント一覧</h2>
          <span className="text-sm text-gray-500">{agents.length}件</span>
        </div>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500">エージェントがまだありません</p>
            <a href="/builder" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
              最初のエージェントを作成する
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.toSorted((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((agent) => (
              <AgentCard key={agent.id} agent={agent} onToggleStatus={toggleStatus} />
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
