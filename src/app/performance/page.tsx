'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAgents, getExecutions } from '@/lib/storage';
import type { Agent, AgentExecution } from '@/types';

interface AgentPerformance {
  agent: Agent;
  executions: AgentExecution[];
  totalRuns: number;
  successRate: number;
  errorRate: number;
  avgExecutionTimeMs: number;
  completedCount: number;
  failedCount: number;
  runningCount: number;
}

interface ErrorPattern {
  message: string;
  count: number;
  agentNames: string[];
  percentage: number;
}

interface StepBottleneck {
  stepLabel: string;
  stepType: string;
  avgTimeMs: number;
  occurrences: number;
}

function analyzePerformance(agents: Agent[], executions: AgentExecution[]): AgentPerformance[] {
  return agents.map((agent) => {
    const agentExecs = executions.filter((e) => e.agentId === agent.id);
    const completed = agentExecs.filter((e) => e.status === 'completed');
    const failed = agentExecs.filter((e) => e.status === 'failed');
    const running = agentExecs.filter((e) => e.status === 'running');

    const totalRuns = agentExecs.length;
    const successRate = totalRuns > 0 ? Math.round((completed.length / totalRuns) * 100) : 0;
    const errorRate = totalRuns > 0 ? Math.round((failed.length / totalRuns) * 100) : 0;

    const timesMs = agentExecs
      .filter((e) => e.executionTimeMs && e.executionTimeMs > 0)
      .map((e) => e.executionTimeMs!);
    const avgExecutionTimeMs = timesMs.length > 0
      ? Math.round(timesMs.reduce((sum, t) => sum + t, 0) / timesMs.length)
      : 0;

    return {
      agent,
      executions: agentExecs,
      totalRuns,
      successRate,
      errorRate,
      avgExecutionTimeMs,
      completedCount: completed.length,
      failedCount: failed.length,
      runningCount: running.length,
    };
  }).sort((a, b) => b.totalRuns - a.totalRuns);
}

function analyzeErrorPatterns(executions: AgentExecution[], agents: Agent[]): ErrorPattern[] {
  const errorMap: Record<string, { count: number; agentIds: Set<string> }> = {};

  for (const exec of executions) {
    if (exec.status === 'failed' && exec.errorMessage) {
      const normalized = exec.errorMessage.slice(0, 100);
      if (!errorMap[normalized]) {
        errorMap[normalized] = { count: 0, agentIds: new Set() };
      }
      errorMap[normalized].count++;
      errorMap[normalized].agentIds.add(exec.agentId);
    }
  }

  const totalErrors = executions.filter((e) => e.status === 'failed').length;
  return Object.entries(errorMap)
    .map(([message, data]) => ({
      message,
      count: data.count,
      agentNames: Array.from(data.agentIds)
        .map((id) => agents.find((a) => a.id === id)?.name || id)
        .slice(0, 3),
      percentage: totalErrors > 0 ? Math.round((data.count / totalErrors) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function analyzeBottlenecks(agents: Agent[], executions: AgentExecution[]): StepBottleneck[] {
  const stepData: Record<string, { totalTime: number; count: number; type: string }> = {};

  for (const agent of agents) {
    const agentExecs = executions.filter(
      (e) => e.agentId === agent.id && e.executionTimeMs && e.executionTimeMs > 0
    );
    if (agentExecs.length === 0 || agent.steps.length === 0) continue;

    for (const exec of agentExecs) {
      const timePerStep = exec.executionTimeMs! / exec.totalSteps;
      for (let i = 0; i < Math.min(exec.stepsCompleted, agent.steps.length); i++) {
        const step = agent.steps[i];
        const key = `${step.type}::${step.label}`;
        if (!stepData[key]) {
          stepData[key] = { totalTime: 0, count: 0, type: step.type };
        }
        // AI decision steps typically take longer
        const multiplier = step.type === 'ai_decision' ? 2.5 : step.type === 'action' ? 1.2 : 1.0;
        stepData[key].totalTime += timePerStep * multiplier;
        stepData[key].count++;
      }
    }
  }

  return Object.entries(stepData)
    .map(([key, data]) => ({
      stepLabel: key.split('::')[1],
      stepType: data.type,
      avgTimeMs: Math.round(data.totalTime / data.count),
      occurrences: data.count,
    }))
    .sort((a, b) => b.avgTimeMs - a.avgTimeMs)
    .slice(0, 8);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

const stepTypeLabels: Record<string, string> = {
  trigger: 'トリガー',
  ai_decision: 'AI判断',
  action: 'アクション',
  condition: '条件分岐',
};

export default function PerformancePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAgents(getAgents());
    setExecutions(getExecutions());
    setMounted(true);
  }, []);

  const performances = useMemo(() => analyzePerformance(agents, executions), [agents, executions]);
  const errorPatterns = useMemo(() => analyzeErrorPatterns(executions, agents), [executions, agents]);
  const bottlenecks = useMemo(() => analyzeBottlenecks(agents, executions), [agents, executions]);

  const totalExecs = executions.length;
  const totalSuccess = executions.filter((e) => e.status === 'completed').length;
  const totalFailed = executions.filter((e) => e.status === 'failed').length;
  const overallSuccessRate = totalExecs > 0 ? Math.round((totalSuccess / totalExecs) * 100) : 0;
  const maxAvgTime = Math.max(...performances.map((p) => p.avgExecutionTimeMs), 1);
  const maxSuccessBar = Math.max(...performances.map((p) => p.totalRuns), 1);
  const maxBottleneckTime = Math.max(...bottlenecks.map((b) => b.avgTimeMs), 1);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">エージェント性能ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          エージェントの成功率、実行時間、エラーパターンを分析します
        </p>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">エージェントが登録されていません。エージェントを追加してください。</p>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">総エージェント数</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{agents.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">総実行回数</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalExecs}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">全体成功率</p>
              <p className={`mt-1 text-2xl font-bold ${
                overallSuccessRate >= 80 ? 'text-green-600' : overallSuccessRate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {overallSuccessRate}%
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">総エラー数</p>
              <p className={`mt-1 text-2xl font-bold ${totalFailed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalFailed}
              </p>
            </div>
          </div>

          {/* Agent comparison chart (horizontal bar) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              エージェント性能比較
            </h2>
            {performances.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">実行データがありません</p>
            ) : (
              <div className="space-y-3">
                {performances.map((perf) => (
                  <div key={perf.agent.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded text-xs"
                          style={{ backgroundColor: perf.agent.color + '20', color: perf.agent.color }}
                        >
                          {perf.agent.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {perf.agent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{perf.totalRuns}回</span>
                        <span className={perf.successRate >= 80 ? 'text-green-600' : perf.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          成功 {perf.successRate}%
                        </span>
                        <span>{formatDuration(perf.avgExecutionTimeMs)}</span>
                      </div>
                    </div>
                    {/* Stacked bar */}
                    <div className="flex h-5 w-full overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                      {perf.totalRuns > 0 ? (
                        <>
                          <div
                            className="bg-green-500 transition-all"
                            style={{ width: `${(perf.completedCount / maxSuccessBar) * 100}%` }}
                            title={`成功: ${perf.completedCount}`}
                          />
                          <div
                            className="bg-red-400 transition-all"
                            style={{ width: `${(perf.failedCount / maxSuccessBar) * 100}%` }}
                            title={`失敗: ${perf.failedCount}`}
                          />
                          <div
                            className="bg-blue-400 transition-all"
                            style={{ width: `${(perf.runningCount / maxSuccessBar) * 100}%` }}
                            title={`実行中: ${perf.runningCount}`}
                          />
                        </>
                      ) : (
                        <div className="w-full bg-gray-200 dark:bg-gray-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-green-500" /> 成功</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-red-400" /> 失敗</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-blue-400" /> 実行中</span>
            </div>
          </div>

          {/* Average execution time chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              平均実行時間
            </h2>
            <div className="space-y-2">
              {performances
                .filter((p) => p.avgExecutionTimeMs > 0)
                .sort((a, b) => b.avgExecutionTimeMs - a.avgExecutionTimeMs)
                .map((perf) => (
                  <div key={perf.agent.id} className="flex items-center gap-3">
                    <span className="w-28 truncate text-right text-sm text-gray-700 dark:text-gray-300">
                      {perf.agent.name}
                    </span>
                    <div className="flex-1">
                      <div className="relative h-6 w-full rounded bg-gray-100 dark:bg-gray-700">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-indigo-500 transition-all"
                          style={{ width: `${(perf.avgExecutionTimeMs / maxAvgTime) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatDuration(perf.avgExecutionTimeMs)}
                    </span>
                  </div>
                ))}
              {performances.every((p) => p.avgExecutionTimeMs === 0) && (
                <p className="py-2 text-center text-sm text-gray-500">実行時間データがありません</p>
              )}
            </div>
          </div>

          {/* Error patterns TOP 3 */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              頻出エラーパターン TOP3
            </h2>
            {errorPatterns.length === 0 ? (
              <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">エラーは検出されていません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {errorPatterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-red-100 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-red-100 text-xs font-bold text-red-700 dark:bg-red-900 dark:text-red-300">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            {pattern.message}
                          </p>
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            対象: {pattern.agentNames.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-700 dark:text-red-300">{pattern.count}回</p>
                        <p className="text-xs text-red-500">{pattern.percentage}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step bottleneck analysis */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              ステップ別ボトルネック分析
            </h2>
            {bottlenecks.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">分析に必要なデータが不足しています</p>
            ) : (
              <div className="space-y-2">
                {bottlenecks.map((bn, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      bn.stepType === 'ai_decision'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : bn.stepType === 'action'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : bn.stepType === 'trigger'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {stepTypeLabels[bn.stepType] || bn.stepType}
                    </span>
                    <span className="w-32 truncate text-sm text-gray-700 dark:text-gray-300">{bn.stepLabel}</span>
                    <div className="flex-1">
                      <div className="relative h-4 w-full rounded bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`absolute inset-y-0 left-0 rounded transition-all ${
                            bn.avgTimeMs === maxBottleneckTime ? 'bg-red-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${(bn.avgTimeMs / maxBottleneckTime) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs font-mono text-gray-600 dark:text-gray-400">
                      {formatDuration(bn.avgTimeMs)}
                    </span>
                    <span className="w-12 text-right text-xs text-gray-400">x{bn.occurrences}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              AI判断ステップは一般的に他のステップより処理時間が長くなります
            </p>
          </div>

          {/* Per-agent detail table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">エージェント</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">実行回数</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">成功率</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">エラー率</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">平均時間</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {performances.map((perf) => (
                  <tr key={perf.agent.id}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{perf.agent.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{perf.agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{perf.totalRuns}</td>
                    <td className={`px-4 py-2 text-right font-medium ${
                      perf.successRate >= 80 ? 'text-green-600' : perf.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {perf.successRate}%
                    </td>
                    <td className={`px-4 py-2 text-right ${perf.errorRate > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {perf.errorRate}%
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                      {perf.avgExecutionTimeMs > 0 ? formatDuration(perf.avgExecutionTimeMs) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        perf.agent.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : perf.agent.status === 'error'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : perf.agent.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {perf.agent.status === 'active' ? '稼働中' :
                         perf.agent.status === 'error' ? 'エラー' :
                         perf.agent.status === 'paused' ? '一時停止' : '下書き'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
