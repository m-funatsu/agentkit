'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import type { AgentExecution } from '@/types';
import { getExecutions, seedDemoData } from '@/lib/storage';
import StatusBadge from '@/components/StatusBadge';

type StatusFilter = 'all' | AgentExecution['status'];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'completed', label: '完了' },
  { value: 'failed', label: '失敗' },
  { value: 'running', label: '実行中' },
  { value: 'awaiting_approval', label: '承認待ち' },
];

const TRIGGER_LABELS: Record<string, string> = {
  schedule: 'スケジュール',
  webhook: 'Webhook',
  email: 'メール',
  manual: '手動',
};

export default function LogsPage() {
  const [executions, setExecutions] = useState<AgentExecution[]>(() => []);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => 'all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    seedDemoData();
    setExecutions(getExecutions());
    setIsLoaded(true);
  }, []);

  const filteredExecutions = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? executions
      : executions.filter((e) => e.status === statusFilter);
    return filtered.toSorted((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [executions, statusFilter]);

  const stats = useMemo(() => {
    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const avgTime = executions.length > 0
      ? Math.round(
          executions
            .filter((e) => e.executionTimeMs !== undefined)
            .reduce((acc, e) => acc + (e.executionTimeMs ?? 0), 0) /
          Math.max(executions.filter((e) => e.executionTimeMs !== undefined).length, 1)
        )
      : 0;
    return { total, completed, failed, avgTime };
  }, [executions]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="logs-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">実行ログ</h1>
        <p className="text-sm text-gray-500">エージェントの実行履歴と結果を確認</p>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="log-stats">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">総実行回数</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500">成功</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-gray-500">失敗</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.avgTime}ms</p>
          <p className="text-xs text-gray-500">平均実行時間</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2" data-testid="status-filter">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            data-testid={`filter-${f.value}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Execution list */}
      <div className="space-y-3" data-testid="execution-list">
        {filteredExecutions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center" data-testid="empty-logs">
            <p className="text-gray-500">実行ログがありません</p>
          </div>
        ) : (
          filteredExecutions.map((exec) => (
            <div
              key={exec.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              data-testid="execution-card"
            >
              <button
                onClick={() => setExpandedId((prev) => (prev === exec.id ? null : exec.id))}
                className="flex w-full items-center justify-between p-4 text-left"
                data-testid="execution-toggle"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={exec.status} />
                  <div>
                    <p className="font-medium text-gray-900">{exec.agentName}</p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(exec.startedAt), 'yyyy/MM/dd HH:mm:ss')}
                      {' '}| {TRIGGER_LABELS[exec.triggerType] ?? exec.triggerType}
                      {' '}| {exec.stepsCompleted}/{exec.totalSteps}ステップ
                    </p>
                  </div>
                </div>
                <span className="text-gray-400">
                  {expandedId === exec.id ? '▲' : '▼'}
                </span>
              </button>
              {expandedId === exec.id ? (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3" data-testid="execution-details">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>実行時間: {exec.executionTimeMs ? `${exec.executionTimeMs}ms` : '-'}</span>
                      {exec.completedAt ? (
                        <span>完了: {format(new Date(exec.completedAt), 'HH:mm:ss')}</span>
                      ) : null}
                    </div>
                    {exec.aiDecisions.length > 0 ? (
                      <div>
                        <h4 className="mb-1 text-sm font-medium text-gray-700">AI判断:</h4>
                        <div className="space-y-1">
                          {exec.aiDecisions.map((decision, i) => (
                            <div
                              key={i}
                              className="rounded-md bg-purple-50 px-3 py-2 text-xs text-purple-800"
                              data-testid="log-ai-decision"
                            >
                              {decision}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {exec.errorMessage ? (
                      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" data-testid="log-error">
                        {exec.errorMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
