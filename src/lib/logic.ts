// =============================================================================
// AgentKit Workflow Engine - Expert Logic Layer
// =============================================================================

import {
  NODE_TYPES,
  LLM_MODELS,
  ERROR_HANDLING_PATTERNS,
  COST_PARAMETERS,
  USD_TO_JPY_RATE,
  type NodeTypeDefinition,
  type LLMModelSpec,
} from '@/data/master-data';

// =============================================================================
// Types
// =============================================================================

/** A node within a workflow graph */
export interface WorkflowNode {
  id: string;
  nodeTypeId: string;            // references NodeTypeDefinition.id
  label: string;
  config: Record<string, string | number | boolean>;
  errorHandlingPatternId?: string; // references ErrorHandlingPattern.id
  position?: { x: number; y: number };
}

/** A directed edge connecting two nodes */
export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string; // for condition branches: 'true' | 'false' | undefined
}

/** Complete workflow definition */
export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** Validation result for a single issue */
export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
}

/** Result of workflow validation */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    triggerCount: number;
    outputCount: number;
    llmCount: number;
    maxDepth: number;
  };
}

/** Status of a single node during simulation */
export interface NodeExecutionResult {
  nodeId: string;
  nodeTypeId: string;
  status: 'completed' | 'failed' | 'skipped' | 'timed_out';
  durationMs: number;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
  retryCount: number;
}

/** Result of a full workflow simulation */
export interface SimulationResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'partial';
  nodeResults: NodeExecutionResult[];
  totalDurationMs: number;
  totalCostUsd: number;
  totalCostJpy: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  criticalPath: string[]; // node IDs in execution order
  timestamp: string;
}

/** Cost estimate for a workflow at a given volume */
export interface CostEstimate {
  workflowId: string;
  monthlyVolume: number;
  perExecutionCost: CostBreakdown;
  monthlyCost: CostBreakdown;
  yearlyCost: CostBreakdown;
  costByNode: Array<{ nodeId: string; label: string; costUsd: number; percentage: number }>;
  recommendations: string[];
}

export interface CostBreakdown {
  tokenCostUsd: number;
  apiCallCostUsd: number;
  computeCostUsd: number;
  totalUsd: number;
  totalJpy: number;
}

/** Bottleneck detection result */
export interface Bottleneck {
  nodeId: string;
  nodeLabel: string;
  type: 'latency' | 'cost' | 'reliability' | 'throughput';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: number;
  threshold: number;
  suggestion: string;
}

/** Parallelization suggestion */
export interface ParallelizationSuggestion {
  groupId: string;
  nodeIds: string[];
  nodeLabels: string[];
  currentSequentialMs: number;
  estimatedParallelMs: number;
  savingsMs: number;
  savingsPercent: number;
}

/** Reliability calculation result */
export interface ReliabilityResult {
  overallReliability: number; // 0-1, probability of success
  nodeReliabilities: Array<{ nodeId: string; reliability: number }>;
  weakestLink: { nodeId: string; reliability: number } | null;
  mtbf: number; // mean time between failures in hours
  expectedFailuresPerMonth: number;
  recommendations: string[];
}

/** Performance benchmark result */
export interface BenchmarkResult {
  workflowId: string;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerMinute: number;
  concurrencyLimit: number;
  memoryEstimateMb: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: string[];
}

/** Code export result */
export interface CodeExport {
  language: 'typescript' | 'python';
  filename: string;
  code: string;
  dependencies: string[];
}

/** Advisory report category */
export interface AdvisoryCategory {
  category: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  findings: string[];
  recommendations: string[];
}

/** Full advisory report */
export interface AdvisoryReport {
  workflowId: string;
  workflowName: string;
  overallScore: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: AdvisoryCategory[];
  timestamp: string;
}

// =============================================================================
// Helper Utilities
// =============================================================================

function resolveNodeType(nodeTypeId: string): NodeTypeDefinition | undefined {
  return NODE_TYPES.find((n) => n.id === nodeTypeId);
}

function resolveLLMModel(nodeTypeId: string): LLMModelSpec | undefined {
  const mapping: Record<string, string> = {
    llm_claude_opus: 'claude-opus-4',
    llm_claude_sonnet: 'claude-sonnet-4',
    llm_claude_haiku: 'claude-haiku-3.5',
    llm_gpt4o: 'gpt-4o',
    llm_gpt4o_mini: 'gpt-4o-mini',
    llm_gemini_pro: 'gemini-2.0-pro',
    llm_gemini_flash: 'gemini-2.0-flash',
  };
  const modelId = mapping[nodeTypeId];
  return modelId ? LLM_MODELS.find((m) => m.id === modelId) : undefined;
}

function buildAdjacencyList(edges: WorkflowEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const children = adj.get(edge.sourceNodeId) ?? [];
    children.push(edge.targetNodeId);
    adj.set(edge.sourceNodeId, children);
  }
  return adj;
}

function buildReverseAdjacencyList(edges: WorkflowEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const parents = adj.get(edge.targetNodeId) ?? [];
    parents.push(edge.sourceNodeId);
    adj.set(edge.targetNodeId, parents);
  }
  return adj;
}

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const adj = buildAdjacencyList(edges);
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const child of adj.get(current) ?? []) {
      const newDegree = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDegree);
      if (newDegree === 0) queue.push(child);
    }
  }

  return sorted;
}

function calculateMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
  const adj = buildAdjacencyList(edges);
  const nodeSet = new Set(nodes.map((n) => n.id));
  const depths = new Map<string, number>();

  function dfs(nodeId: string): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!;
    const children = (adj.get(nodeId) ?? []).filter((c) => nodeSet.has(c));
    const depth = children.length === 0 ? 1 : 1 + Math.max(...children.map(dfs));
    depths.set(nodeId, depth);
    return depth;
  }

  let maxDepth = 0;
  for (const node of nodes) {
    maxDepth = Math.max(maxDepth, dfs(node.id));
  }
  return maxDepth;
}

function hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const sorted = topologicalSort(nodes, edges);
  return sorted.length < nodes.length;
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// =============================================================================
// 1. validateWorkflow
// =============================================================================

export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // --- Structural Checks ---

  // Must have at least one node
  if (nodes.length === 0) {
    issues.push({ severity: 'error', code: 'EMPTY_WORKFLOW', message: 'ワークフローにノードがありません。' });
  }

  // Check for duplicate node IDs
  const seenIds = new Set<string>();
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      issues.push({ severity: 'error', nodeId: node.id, code: 'DUPLICATE_NODE_ID', message: `ノードID "${node.id}" が重複しています。` });
    }
    seenIds.add(node.id);
  }

  // Validate node type references
  for (const node of nodes) {
    const typeDef = resolveNodeType(node.nodeTypeId);
    if (!typeDef) {
      issues.push({ severity: 'error', nodeId: node.id, code: 'UNKNOWN_NODE_TYPE', message: `不明なノード種類 "${node.nodeTypeId}" です。` });
      continue;
    }

    // Validate required config fields
    for (const [fieldName, fieldDef] of Object.entries(typeDef.configSchema) as Array<[string, { type: string; label: string; required: boolean }]>) {
      if (fieldDef.required && (node.config[fieldName] === undefined || node.config[fieldName] === '')) {
        issues.push({
          severity: 'error',
          nodeId: node.id,
          code: 'MISSING_REQUIRED_CONFIG',
          message: `ノード "${node.label}" の必須設定 "${fieldDef.label}" が未入力です。`,
        });
      }
    }
  }

  // Validate edges reference existing nodes
  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push({ severity: 'error', edgeId: edge.id, code: 'INVALID_EDGE_SOURCE', message: `エッジ "${edge.id}" のソースノード "${edge.sourceNodeId}" が存在しません。` });
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push({ severity: 'error', edgeId: edge.id, code: 'INVALID_EDGE_TARGET', message: `エッジ "${edge.id}" のターゲットノード "${edge.targetNodeId}" が存在しません。` });
    }
    if (edge.sourceNodeId === edge.targetNodeId) {
      issues.push({ severity: 'error', edgeId: edge.id, code: 'SELF_LOOP', message: `エッジ "${edge.id}" が自己ループしています。` });
    }
  }

  // Check for cycles
  if (hasCycle(nodes, edges)) {
    issues.push({ severity: 'error', code: 'CYCLE_DETECTED', message: 'ワークフローに循環参照が検出されました。DAG（有向非巡回グラフ）である必要があります。' });
  }

  // --- Semantic Checks ---

  const triggerNodes = nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'trigger');
  const outputNodes = nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'output');
  const llmNodes = nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'llm');

  // Must have exactly one trigger
  if (triggerNodes.length === 0) {
    issues.push({ severity: 'error', code: 'NO_TRIGGER', message: 'トリガーノードが必要です。ワークフローの開始条件を定義してください。' });
  }
  if (triggerNodes.length > 1) {
    issues.push({ severity: 'warning', code: 'MULTIPLE_TRIGGERS', message: '複数のトリガーノードがあります。通常は1つのトリガーが推奨されます。' });
  }

  // Should have at least one output
  if (outputNodes.length === 0) {
    issues.push({ severity: 'warning', code: 'NO_OUTPUT', message: '出力ノードがありません。結果を外部に送信するノードの追加を検討してください。' });
  }

  // Check for orphan nodes (no incoming or outgoing edges, excluding triggers)
  const reverseAdj = buildReverseAdjacencyList(edges);
  const forwardAdj = buildAdjacencyList(edges);
  for (const node of nodes) {
    const typeDef = resolveNodeType(node.nodeTypeId);
    const hasIncoming = (reverseAdj.get(node.id) ?? []).length > 0;
    const hasOutgoing = (forwardAdj.get(node.id) ?? []).length > 0;

    if (typeDef?.category !== 'trigger' && !hasIncoming) {
      issues.push({ severity: 'warning', nodeId: node.id, code: 'ORPHAN_NODE', message: `ノード "${node.label}" に入力エッジがありません。到達不能な可能性があります。` });
    }
    if (typeDef?.category !== 'output' && !hasOutgoing && typeDef?.category !== 'trigger') {
      // Only warn if it's not the only node
      if (nodes.length > 1) {
        issues.push({ severity: 'info', nodeId: node.id, code: 'TERMINAL_NODE', message: `ノード "${node.label}" に出力エッジがありません。意図的な終端ノードか確認してください。` });
      }
    }
  }

  // Check for error handling on LLM nodes
  for (const llmNode of llmNodes) {
    if (!llmNode.errorHandlingPatternId) {
      issues.push({
        severity: 'warning',
        nodeId: llmNode.id,
        code: 'NO_ERROR_HANDLING',
        message: `LLMノード "${llmNode.label}" にエラーハンドリングが設定されていません。リトライまたはフォールバックの設定を推奨します。`,
      });
    }
  }

  const maxDepth = nodes.length > 0 ? calculateMaxDepth(nodes, edges) : 0;

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      triggerCount: triggerNodes.length,
      outputCount: outputNodes.length,
      llmCount: llmNodes.length,
      maxDepth,
    },
  };
}

// =============================================================================
// 2. simulateExecution
// =============================================================================

export function simulateExecution(workflow: Workflow): SimulationResult {
  const sortedNodeIds = topologicalSort(workflow.nodes, workflow.edges);
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
  const nodeResults: NodeExecutionResult[] = [];
  let totalDurationMs = 0;
  let totalCostUsd = 0;
  let hasFailed = false;

  for (const nodeId of sortedNodeIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    if (hasFailed) {
      nodeResults.push({
        nodeId,
        nodeTypeId: node.nodeTypeId,
        status: 'skipped',
        durationMs: 0,
        costUsd: 0,
        retryCount: 0,
      });
      continue;
    }

    const typeDef = resolveNodeType(node.nodeTypeId);
    const llmModel = resolveLLMModel(node.nodeTypeId);

    // Simulate latency with variance
    const baseLatency = typeDef?.avgLatencyMs ?? 1000;
    const variance = baseLatency * (0.5 + Math.random());
    const durationMs = Math.round(variance);

    // Simulate failure probability based on node type
    const failureProbabilities: Record<string, number> = {
      trigger: 0.02,
      llm: 0.08,
      tool: 0.10,
      logic: 0.01,
      output: 0.05,
    };
    const failProb = failureProbabilities[typeDef?.category ?? 'tool'] ?? 0.05;
    const failed = Math.random() < failProb;

    // Simulate tokens for LLM nodes
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let costUsd = typeDef?.costPerExecution ?? 0;

    if (llmModel) {
      inputTokens = 500 + Math.floor(Math.random() * 2000);
      outputTokens = 200 + Math.floor(Math.random() * 1500);
      costUsd =
        (inputTokens / 1000) * llmModel.inputCostPer1kTokens +
        (outputTokens / 1000) * llmModel.outputCostPer1kTokens;
    }

    // Simulate retries
    let retryCount = 0;
    if (failed && node.errorHandlingPatternId) {
      const pattern = ERROR_HANDLING_PATTERNS.find((p) => p.id === node.errorHandlingPatternId);
      if (pattern?.strategy === 'retry') {
        retryCount = Math.floor(Math.random() * ((pattern.defaultConfig.maxRetries as number) ?? 3));
      }
    }

    const finalFailed = failed && retryCount === 0;

    nodeResults.push({
      nodeId,
      nodeTypeId: node.nodeTypeId,
      status: finalFailed ? 'failed' : 'completed',
      durationMs,
      costUsd: finalFailed ? costUsd * 0.3 : costUsd, // partial cost on failure
      inputTokens,
      outputTokens,
      errorMessage: finalFailed ? `ノード "${node.label}" の実行に失敗しました。` : undefined,
      retryCount,
    });

    totalDurationMs += durationMs + retryCount * durationMs * 0.5;
    totalCostUsd += finalFailed ? costUsd * 0.3 : costUsd * (1 + retryCount * 0.5);

    if (finalFailed) {
      hasFailed = true;
    }
  }

  const completedNodes = nodeResults.filter((r) => r.status === 'completed').length;
  const failedNodes = nodeResults.filter((r) => r.status === 'failed').length;
  const skippedNodes = nodeResults.filter((r) => r.status === 'skipped').length;

  return {
    workflowId: workflow.id,
    status: failedNodes > 0 ? 'failed' : skippedNodes > 0 ? 'partial' : 'completed',
    nodeResults,
    totalDurationMs: Math.round(totalDurationMs),
    totalCostUsd: Math.round(totalCostUsd * 1000000) / 1000000,
    totalCostJpy: Math.round(totalCostUsd * USD_TO_JPY_RATE * 100) / 100,
    completedNodes,
    failedNodes,
    skippedNodes,
    criticalPath: sortedNodeIds,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// 3. estimateCost
// =============================================================================

export function estimateCost(workflow: Workflow, monthlyVolume: number): CostEstimate {
  const costByNode: CostEstimate['costByNode'] = [];
  let totalTokenCost = 0;
  let totalApiCallCost = 0;
  let totalComputeCost = 0;

  for (const node of workflow.nodes) {
    const typeDef = resolveNodeType(node.nodeTypeId);
    const llmModel = resolveLLMModel(node.nodeTypeId);
    let nodeCost = 0;

    if (llmModel) {
      // Estimate average token usage
      const avgInputTokens = 1200;
      const avgOutputTokens = 800;
      const tokenCost =
        (avgInputTokens / 1000) * llmModel.inputCostPer1kTokens +
        (avgOutputTokens / 1000) * llmModel.outputCostPer1kTokens;
      nodeCost = tokenCost;
      totalTokenCost += tokenCost;
    } else if (typeDef) {
      nodeCost = typeDef.costPerExecution;
      if (typeDef.category === 'output') {
        totalApiCallCost += typeDef.costPerExecution;
      }
    }

    // Compute time cost
    const computeTime = (typeDef?.avgLatencyMs ?? 0) / 1000;
    const computeParam = COST_PARAMETERS.find((p) => p.id === 'cost_compute_time');
    const computeCost = computeTime * (computeParam?.unitCostUsd ?? 0.00001);
    totalComputeCost += computeCost;
    nodeCost += computeCost;

    costByNode.push({
      nodeId: node.id,
      label: node.label,
      costUsd: nodeCost,
      percentage: 0, // calculated below
    });
  }

  const perExecTotal = totalTokenCost + totalApiCallCost + totalComputeCost;

  // Calculate percentages
  for (const entry of costByNode) {
    entry.percentage = perExecTotal > 0 ? Math.round((entry.costUsd / perExecTotal) * 10000) / 100 : 0;
  }

  const buildBreakdown = (multiplier: number): CostBreakdown => ({
    tokenCostUsd: Math.round(totalTokenCost * multiplier * 1000000) / 1000000,
    apiCallCostUsd: Math.round(totalApiCallCost * multiplier * 1000000) / 1000000,
    computeCostUsd: Math.round(totalComputeCost * multiplier * 1000000) / 1000000,
    totalUsd: Math.round(perExecTotal * multiplier * 10000) / 10000,
    totalJpy: Math.round(perExecTotal * multiplier * USD_TO_JPY_RATE * 100) / 100,
  });

  // Generate recommendations
  const recommendations: string[] = [];
  const llmNodes = workflow.nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'llm');

  if (llmNodes.length > 0) {
    const flagshipNodes = llmNodes.filter((n) => {
      const model = resolveLLMModel(n.nodeTypeId);
      return model?.tier === 'flagship';
    });
    if (flagshipNodes.length > 0 && monthlyVolume > 500) {
      recommendations.push(
        `高ボリューム（月${monthlyVolume}回）ではFlagshipモデルのコストが大きくなります。` +
        `分類や抽出タスクにはHaikuやFlashクラスへの切り替えを検討してください。`
      );
    }

    if (llmNodes.length >= 3) {
      recommendations.push(
        'LLMノードが3つ以上あります。プロンプトの統合で呼び出し回数を削減できる可能性があります。'
      );
    }
  }

  if (monthlyVolume > 10000) {
    recommendations.push(
      '月間実行回数が10,000回を超えています。バッチ処理やキャッシュの導入でコスト削減が見込めます。'
    );
  }

  if (perExecTotal * monthlyVolume * USD_TO_JPY_RATE > 50000) {
    recommendations.push(
      '月間コストが50,000円を超える見込みです。ボリュームディスカウントやコミットメントプランの検討を推奨します。'
    );
  }

  return {
    workflowId: workflow.id,
    monthlyVolume,
    perExecutionCost: buildBreakdown(1),
    monthlyCost: buildBreakdown(monthlyVolume),
    yearlyCost: buildBreakdown(monthlyVolume * 12),
    costByNode,
    recommendations,
  };
}

// =============================================================================
// 4. optimizeTokenUsage
// =============================================================================

export interface TokenOptimization {
  nodeId: string;
  currentModelId: string;
  suggestedModelId: string;
  currentCostPerExec: number;
  suggestedCostPerExec: number;
  savingsPercent: number;
  tradeoff: string;
}

export function optimizeTokenUsage(workflow: Workflow): TokenOptimization[] {
  const optimizations: TokenOptimization[] = [];

  for (const node of workflow.nodes) {
    const currentModel = resolveLLMModel(node.nodeTypeId);
    if (!currentModel) continue;

    // Average token estimation
    const avgInputTokens = 1200;
    const avgOutputTokens = 800;
    const currentCost =
      (avgInputTokens / 1000) * currentModel.inputCostPer1kTokens +
      (avgOutputTokens / 1000) * currentModel.outputCostPer1kTokens;

    // Find cheaper alternatives that maintain acceptable quality
    const cheaper = LLM_MODELS.filter(
      (m) =>
        m.id !== currentModel.id &&
        m.qualityScore >= currentModel.qualityScore - 3 &&
        (avgInputTokens / 1000) * m.inputCostPer1kTokens +
          (avgOutputTokens / 1000) * m.outputCostPer1kTokens <
          currentCost * 0.7
    );

    if (cheaper.length === 0) continue;

    // Sort by best value (quality/cost ratio)
    cheaper.sort((a, b) => {
      const costA = (avgInputTokens / 1000) * a.inputCostPer1kTokens + (avgOutputTokens / 1000) * a.outputCostPer1kTokens;
      const costB = (avgInputTokens / 1000) * b.inputCostPer1kTokens + (avgOutputTokens / 1000) * b.outputCostPer1kTokens;
      const valueA = a.qualityScore / costA;
      const valueB = b.qualityScore / costB;
      return valueB - valueA;
    });

    const best = cheaper[0];
    const suggestedCost =
      (avgInputTokens / 1000) * best.inputCostPer1kTokens +
      (avgOutputTokens / 1000) * best.outputCostPer1kTokens;

    const qualityDiff = currentModel.qualityScore - best.qualityScore;
    let tradeoff = '';
    if (qualityDiff <= 1) tradeoff = '品質への影響は最小限です。';
    else if (qualityDiff <= 3) tradeoff = `品質スコアが${qualityDiff}ポイント低下しますが、コスト効率が大幅に改善します。`;
    else tradeoff = `品質スコアが${qualityDiff}ポイント低下します。重要なタスクには推奨しません。`;

    optimizations.push({
      nodeId: node.id,
      currentModelId: currentModel.id,
      suggestedModelId: best.id,
      currentCostPerExec: Math.round(currentCost * 1000000) / 1000000,
      suggestedCostPerExec: Math.round(suggestedCost * 1000000) / 1000000,
      savingsPercent: Math.round((1 - suggestedCost / currentCost) * 100),
      tradeoff,
    });
  }

  return optimizations;
}

// =============================================================================
// 5. detectBottlenecks
// =============================================================================

export function detectBottlenecks(workflow: Workflow): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];
  const totalLatency = workflow.nodes.reduce((sum, n) => {
    const t = resolveNodeType(n.nodeTypeId);
    return sum + (t?.avgLatencyMs ?? 0);
  }, 0);

  for (const node of workflow.nodes) {
    const typeDef = resolveNodeType(node.nodeTypeId);
    if (!typeDef) continue;

    // Latency bottleneck: single node takes >40% of total time
    if (totalLatency > 0 && typeDef.avgLatencyMs / totalLatency > 0.4) {
      bottlenecks.push({
        nodeId: node.id,
        nodeLabel: node.label,
        type: 'latency',
        severity: typeDef.avgLatencyMs > 10000 ? 'critical' : 'high',
        metric: typeDef.avgLatencyMs,
        threshold: totalLatency * 0.4,
        suggestion: `ノード "${node.label}" が全体レイテンシの${Math.round((typeDef.avgLatencyMs / totalLatency) * 100)}%を占めています。より高速なモデルへの切り替えまたは処理の分割を検討してください。`,
      });
    }

    // Cost bottleneck: node cost is disproportionately high
    if (typeDef.costPerExecution > 0.05) {
      bottlenecks.push({
        nodeId: node.id,
        nodeLabel: node.label,
        type: 'cost',
        severity: typeDef.costPerExecution > 0.1 ? 'high' : 'medium',
        metric: typeDef.costPerExecution,
        threshold: 0.05,
        suggestion: `ノード "${node.label}" の実行コストが$${typeDef.costPerExecution}/回です。低コストモデルへの変更やキャッシュの導入を検討してください。`,
      });
    }

    // Reliability bottleneck: external API calls without error handling
    if ((typeDef.category === 'tool' || typeDef.category === 'output') && !node.errorHandlingPatternId) {
      bottlenecks.push({
        nodeId: node.id,
        nodeLabel: node.label,
        type: 'reliability',
        severity: 'medium',
        metric: 0,
        threshold: 0,
        suggestion: `ノード "${node.label}" にエラーハンドリングが設定されていません。リトライまたはフォールバックの追加を推奨します。`,
      });
    }

    // Throughput bottleneck: high-latency nodes limiting throughput
    if (typeDef.avgLatencyMs > 5000) {
      const throughputPerMin = Math.floor(60000 / typeDef.avgLatencyMs);
      if (throughputPerMin < 10) {
        bottlenecks.push({
          nodeId: node.id,
          nodeLabel: node.label,
          type: 'throughput',
          severity: throughputPerMin < 5 ? 'high' : 'medium',
          metric: throughputPerMin,
          threshold: 10,
          suggestion: `ノード "${node.label}" のスループットが${throughputPerMin}回/分に制限されています。並列実行またはバッチ処理の導入を検討してください。`,
        });
      }
    }
  }

  return bottlenecks;
}

// =============================================================================
// 6. suggestParallelization
// =============================================================================

export function suggestParallelization(workflow: Workflow): ParallelizationSuggestion[] {
  const suggestions: ParallelizationSuggestion[] = [];
  const reverseAdj = buildReverseAdjacencyList(workflow.edges);
  const forwardAdj = buildAdjacencyList(workflow.edges);
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  // Find nodes that share the same parent (siblings that can be parallelized)
  const parentToChildren = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const children = parentToChildren.get(edge.sourceNodeId) ?? [];
    children.push(edge.targetNodeId);
    parentToChildren.set(edge.sourceNodeId, children);
  }

  let groupCounter = 0;

  parentToChildren.forEach((children, _parentId) => {
    if (children.length < 2) return;

    // Check that children are independent (no edges between them)
    const childSet = new Set(children);
    let independent = true;
    for (const child of children) {
      const childTargets = forwardAdj.get(child) ?? [];
      if (childTargets.some((t) => childSet.has(t))) {
        independent = false;
        break;
      }
    }

    if (!independent) return;

    const nodeLabels: string[] = [];
    let sequentialMs = 0;
    let maxMs = 0;

    for (const childId of children) {
      const node = nodeMap.get(childId);
      const typeDef = node ? resolveNodeType(node.nodeTypeId) : undefined;
      const latency = typeDef?.avgLatencyMs ?? 1000;
      nodeLabels.push(node?.label ?? childId);
      sequentialMs += latency;
      maxMs = Math.max(maxMs, latency);
    }

    const savingsMs = sequentialMs - maxMs;
    if (savingsMs <= 500) return; // not worth parallelizing

    groupCounter++;
    suggestions.push({
      groupId: `parallel_group_${groupCounter}`,
      nodeIds: children,
      nodeLabels,
      currentSequentialMs: sequentialMs,
      estimatedParallelMs: maxMs,
      savingsMs,
      savingsPercent: Math.round((savingsMs / sequentialMs) * 100),
    });
  });

  return suggestions;
}

// =============================================================================
// 7. calculateReliability
// =============================================================================

export function calculateReliability(
  workflow: Workflow,
  errorRates: Record<string, number> // nodeId -> failure probability (0-1)
): ReliabilityResult {
  const nodeReliabilities: ReliabilityResult['nodeReliabilities'] = [];
  let overallReliability = 1.0;
  let weakestLink: ReliabilityResult['weakestLink'] = null;

  const sortedIds = topologicalSort(workflow.nodes, workflow.edges);
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Get error rate from provided data or use defaults based on node type
    let errorRate = errorRates[nodeId];
    if (errorRate === undefined) {
      const typeDef = resolveNodeType(node.nodeTypeId);
      const defaults: Record<string, number> = {
        trigger: 0.02,
        llm: 0.05,
        tool: 0.08,
        logic: 0.005,
        output: 0.04,
      };
      errorRate = defaults[typeDef?.category ?? 'tool'] ?? 0.05;
    }

    // Account for error handling (retry reduces effective error rate)
    if (node.errorHandlingPatternId) {
      const pattern = ERROR_HANDLING_PATTERNS.find((p) => p.id === node.errorHandlingPatternId);
      if (pattern?.strategy === 'retry') {
        const maxRetries = (pattern.defaultConfig.maxRetries as number) ?? 3;
        errorRate = Math.pow(errorRate, maxRetries + 1); // all retries must fail
      } else if (pattern?.strategy === 'fallback') {
        errorRate = errorRate * 0.1; // fallback catches most errors
      } else if (pattern?.strategy === 'circuit_breaker') {
        errorRate = errorRate * 0.5; // circuit breaker prevents cascade
      }
    }

    const reliability = 1 - errorRate;
    nodeReliabilities.push({ nodeId, reliability });
    overallReliability *= reliability;

    if (!weakestLink || reliability < weakestLink.reliability) {
      weakestLink = { nodeId, reliability };
    }
  }

  // MTBF: assuming 1 execution per hour on average
  const mtbf = overallReliability > 0 ? 1 / (1 - overallReliability) : 0;
  const expectedFailuresPerMonth = 720 * (1 - overallReliability); // 720 hours/month

  // Recommendations
  const recommendations: string[] = [];

  if (overallReliability < 0.9) {
    recommendations.push(
      `全体の信頼性が${Math.round(overallReliability * 100)}%と低い水準です。エラーハンドリングの強化が急務です。`
    );
  }

  if (weakestLink && weakestLink.reliability < 0.95) {
    const weakNode = nodeMap.get(weakestLink.nodeId);
    recommendations.push(
      `最も脆弱なノードは "${weakNode?.label ?? weakestLink.nodeId}"（信頼性${Math.round(weakestLink.reliability * 100)}%）です。リトライパターンの適用を推奨します。`
    );
  }

  const nodesWithoutErrorHandling = workflow.nodes.filter(
    (n) => !n.errorHandlingPatternId && resolveNodeType(n.nodeTypeId)?.category !== 'logic'
  );
  if (nodesWithoutErrorHandling.length > 0) {
    recommendations.push(
      `${nodesWithoutErrorHandling.length}個のノードにエラーハンドリングが未設定です。最低限リトライパターンの設定を推奨します。`
    );
  }

  return {
    overallReliability: Math.round(overallReliability * 10000) / 10000,
    nodeReliabilities,
    weakestLink,
    mtbf: Math.round(mtbf * 100) / 100,
    expectedFailuresPerMonth: Math.round(expectedFailuresPerMonth * 100) / 100,
    recommendations,
  };
}

// =============================================================================
// 8. benchmarkPerformance
// =============================================================================

export function benchmarkPerformance(workflow: Workflow): BenchmarkResult {
  const sortedIds = topologicalSort(workflow.nodes, workflow.edges);
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  // Calculate latencies along critical path
  let totalBaseLatency = 0;
  const latencies: number[] = [];

  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const typeDef = resolveNodeType(node.nodeTypeId);
    const latency = typeDef?.avgLatencyMs ?? 500;
    totalBaseLatency += latency;
    latencies.push(latency);
  }

  // Statistical estimates with variance
  const p50 = totalBaseLatency;
  const p95 = Math.round(totalBaseLatency * 1.8);
  const p99 = Math.round(totalBaseLatency * 2.5);

  // Throughput: limited by slowest node
  const maxNodeLatency = latencies.length > 0 ? Math.max(...latencies) : 1000;
  const throughput = Math.floor(60000 / maxNodeLatency);

  // Concurrency limit based on node types
  const llmNodeCount = workflow.nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'llm').length;
  const concurrencyLimit = Math.max(1, Math.min(50, Math.floor(100 / Math.max(llmNodeCount * 2, 1))));

  // Memory estimate
  const memoryEstimate = 10 + workflow.nodes.length * 2 + llmNodeCount * 15;

  // Grade calculation
  let score = 100;
  if (p50 > 30000) score -= 30;
  else if (p50 > 15000) score -= 15;
  else if (p50 > 5000) score -= 5;

  if (throughput < 5) score -= 25;
  else if (throughput < 15) score -= 10;

  if (concurrencyLimit < 5) score -= 15;
  if (memoryEstimate > 100) score -= 10;

  const grade = scoreToGrade(score);

  const details: string[] = [];
  details.push(`中央値レイテンシ: ${p50}ms`);
  details.push(`95パーセンタイル: ${p95}ms`);
  details.push(`最大スループット: ${throughput}回/分`);
  details.push(`推奨同時実行数: ${concurrencyLimit}`);
  details.push(`推定メモリ使用量: ${memoryEstimate}MB`);

  if (p50 > 15000) {
    details.push('レイテンシが高いです。高速モデルへの切り替えまたは処理の並列化を検討してください。');
  }
  if (throughput < 10) {
    details.push('スループットが制限されています。ボトルネックノードの最適化が必要です。');
  }

  return {
    workflowId: workflow.id,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    throughputPerMinute: throughput,
    concurrencyLimit,
    memoryEstimateMb: memoryEstimate,
    grade,
    details,
  };
}

// =============================================================================
// 9. generateCodeExport
// =============================================================================

export function generateCodeExport(workflow: Workflow, language: 'typescript' | 'python' = 'typescript'): CodeExport {
  const sortedIds = topologicalSort(workflow.nodes, workflow.edges);
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  if (language === 'typescript') {
    return generateTypeScriptExport(workflow, sortedIds, nodeMap);
  }
  return generatePythonExport(workflow, sortedIds, nodeMap);
}

function generateTypeScriptExport(
  workflow: Workflow,
  sortedIds: string[],
  nodeMap: Map<string, WorkflowNode>
): CodeExport {
  const deps = new Set<string>();
  const lines: string[] = [];

  lines.push('// Auto-generated workflow: ' + workflow.name);
  lines.push('// Generated by AgentKit Workflow Engine');
  lines.push('');

  // Determine dependencies
  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const typeDef = resolveNodeType(node.nodeTypeId);
    if (typeDef?.category === 'llm') {
      const model = resolveLLMModel(node.nodeTypeId);
      if (model?.provider === 'anthropic') deps.add('@anthropic-ai/sdk');
      if (model?.provider === 'openai') deps.add('openai');
      if (model?.provider === 'google') deps.add('@google/generative-ai');
    }
  }

  // Imports
  Array.from(deps).forEach((dep) => {
    const importName = dep.replace(/[^a-zA-Z]/g, '');
    lines.push(`import ${importName} from '${dep}';`);
  });
  lines.push('');

  // Config interface
  lines.push('interface WorkflowConfig {');
  lines.push('  apiKeys: Record<string, string>;');
  lines.push('  timeoutMs?: number;');
  lines.push('  maxRetries?: number;');
  lines.push('}');
  lines.push('');

  // Step result interface
  lines.push('interface StepResult {');
  lines.push('  nodeId: string;');
  lines.push('  status: "completed" | "failed";');
  lines.push('  data: unknown;');
  lines.push('  durationMs: number;');
  lines.push('}');
  lines.push('');

  // Main function
  const fnName = workflow.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  lines.push(`export async function execute_${fnName}(input: Record<string, unknown>, config: WorkflowConfig): Promise<StepResult[]> {`);
  lines.push('  const results: StepResult[] = [];');
  lines.push('  let context: Record<string, unknown> = { ...input };');
  lines.push('');

  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const typeDef = resolveNodeType(node.nodeTypeId);

    lines.push(`  // Step: ${node.label}`);
    lines.push('  {');
    lines.push('    const startTime = Date.now();');
    lines.push('    try {');

    if (typeDef?.category === 'llm') {
      lines.push(`      // LLM call: ${node.nodeTypeId}`);
      lines.push(`      const prompt = ${JSON.stringify(node.config.systemPrompt ?? '')};`);
      lines.push('      const response = await callLLM(prompt, JSON.stringify(context), config);');
      lines.push('      context = { ...context, [`result_${nodeId}`]: response };');
    } else if (typeDef?.category === 'tool') {
      lines.push(`      // Tool: ${node.nodeTypeId}`);
      lines.push(`      const toolResult = await executeTool(${JSON.stringify(node.nodeTypeId)}, context, config);`);
      lines.push('      context = { ...context, [`result_${nodeId}`]: toolResult };');
    } else if (typeDef?.category === 'logic') {
      lines.push(`      // Logic: ${typeDef.nameEn}`);
      lines.push(`      const condition = evaluateCondition(${JSON.stringify(node.config.condition ?? 'true')}, context);`);
      lines.push('      context = { ...context, [`condition_${nodeId}`]: condition };');
    } else if (typeDef?.category === 'output') {
      lines.push(`      // Output: ${typeDef.nameEn}`);
      lines.push(`      await sendOutput(${JSON.stringify(node.nodeTypeId)}, context, config);`);
    } else {
      lines.push('      // Trigger node - workflow entry point');
    }

    lines.push(`      results.push({ nodeId: ${JSON.stringify(nodeId)}, status: "completed", data: context, durationMs: Date.now() - startTime });`);
    lines.push('    } catch (error) {');
    lines.push(`      results.push({ nodeId: ${JSON.stringify(nodeId)}, status: "failed", data: error, durationMs: Date.now() - startTime });`);
    lines.push('      throw error;');
    lines.push('    }');
    lines.push('  }');
    lines.push('');
  }

  lines.push('  return results;');
  lines.push('}');

  return {
    language: 'typescript',
    filename: `workflow_${workflow.id}.ts`,
    code: lines.join('\n'),
    dependencies: Array.from(deps),
  };
}

function generatePythonExport(
  workflow: Workflow,
  sortedIds: string[],
  nodeMap: Map<string, WorkflowNode>
): CodeExport {
  const deps = new Set<string>();
  const lines: string[] = [];

  lines.push('# Auto-generated workflow: ' + workflow.name);
  lines.push('# Generated by AgentKit Workflow Engine');
  lines.push('');
  lines.push('import asyncio');
  lines.push('import time');
  lines.push('from typing import Any');
  lines.push('');

  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const model = resolveLLMModel(node.nodeTypeId);
    if (model?.provider === 'anthropic') deps.add('anthropic');
    if (model?.provider === 'openai') deps.add('openai');
    if (model?.provider === 'google') deps.add('google-generativeai');
  }

  Array.from(deps).forEach((dep) => {
    lines.push(`import ${dep.replace(/-/g, '_')}`);
  });
  lines.push('');

  const fnName = workflow.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
  lines.push(`async def execute_${fnName}(input_data: dict[str, Any], config: dict[str, Any]) -> list[dict]:`);
  lines.push('    """Execute the workflow pipeline."""');
  lines.push('    results: list[dict] = []');
  lines.push('    context = {**input_data}');
  lines.push('');

  for (const nodeId of sortedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;
    const typeDef = resolveNodeType(node.nodeTypeId);

    lines.push(`    # Step: ${node.label}`);
    lines.push('    start_time = time.monotonic()');
    lines.push('    try:');

    if (typeDef?.category === 'llm') {
      lines.push(`        response = await call_llm("${node.nodeTypeId}", context, config)`);
      lines.push(`        context["result_${nodeId}"] = response`);
    } else if (typeDef?.category === 'tool') {
      lines.push(`        tool_result = await execute_tool("${node.nodeTypeId}", context, config)`);
      lines.push(`        context["result_${nodeId}"] = tool_result`);
    } else if (typeDef?.category === 'logic') {
      lines.push(`        condition = evaluate_condition("${node.config.condition ?? 'true'}", context)`);
      lines.push(`        context["condition_${nodeId}"] = condition`);
    } else if (typeDef?.category === 'output') {
      lines.push(`        await send_output("${node.nodeTypeId}", context, config)`);
    } else {
      lines.push('        pass  # Trigger node');
    }

    lines.push(`        results.append({`);
    lines.push(`            "node_id": "${nodeId}",`);
    lines.push(`            "status": "completed",`);
    lines.push(`            "duration_ms": int((time.monotonic() - start_time) * 1000),`);
    lines.push('        })');
    lines.push('    except Exception as e:');
    lines.push(`        results.append({`);
    lines.push(`            "node_id": "${nodeId}",`);
    lines.push(`            "status": "failed",`);
    lines.push(`            "error": str(e),`);
    lines.push(`            "duration_ms": int((time.monotonic() - start_time) * 1000),`);
    lines.push('        })');
    lines.push('        raise');
    lines.push('');
  }

  lines.push('    return results');

  return {
    language: 'python',
    filename: `workflow_${workflow.id}.py`,
    code: lines.join('\n'),
    dependencies: Array.from(deps),
  };
}

// =============================================================================
// 10. generateAdvisory
// =============================================================================

export function generateAdvisory(workflow: Workflow): AdvisoryReport {
  const categories: AdvisoryCategory[] = [];

  // --- 1. Workflow Efficiency ---
  {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const validation = validateWorkflow(workflow.nodes, workflow.edges);
    const errors = validation.issues.filter((i) => i.severity === 'error').length;
    const warnings = validation.issues.filter((i) => i.severity === 'warning').length;

    if (errors > 0) {
      score -= errors * 20;
      findings.push(`${errors}件のバリデーションエラーがあります。`);
      recommendations.push('全てのバリデーションエラーを解消してください。');
    }
    if (warnings > 0) {
      score -= warnings * 5;
      findings.push(`${warnings}件の警告があります。`);
    }

    if (validation.stats.maxDepth > 8) {
      score -= 10;
      findings.push(`ワークフローの深さが${validation.stats.maxDepth}レベルと深い構造です。`);
      recommendations.push('ワークフローの深さを8レベル以下に抑えることを推奨します。サブワークフローへの分割を検討してください。');
    }

    const parallelOpts = suggestParallelization(workflow);
    if (parallelOpts.length > 0) {
      const totalSavings = parallelOpts.reduce((s, p) => s + p.savingsMs, 0);
      findings.push(`${parallelOpts.length}箇所の並列化機会があります（推定${totalSavings}ms短縮）。`);
      recommendations.push('独立したノードの並列実行により、レイテンシを削減できます。');
      score -= 5;
    }

    if (validation.stats.totalNodes === 0) score = 0;

    categories.push({
      category: 'ワークフロー効率',
      score: Math.max(0, Math.min(100, score)),
      grade: scoreToGrade(Math.max(0, Math.min(100, score))),
      findings,
      recommendations,
    });
  }

  // --- 2. Cost Optimization ---
  {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const costEstimate = estimateCost(workflow, 100); // baseline 100 exec/month
    const tokenOpts = optimizeTokenUsage(workflow);

    findings.push(`1回あたりの推定コスト: $${costEstimate.perExecutionCost.totalUsd} (${costEstimate.perExecutionCost.totalJpy}円)`);
    findings.push(`月間推定コスト（100回実行）: $${costEstimate.monthlyCost.totalUsd} (${costEstimate.monthlyCost.totalJpy}円)`);

    if (tokenOpts.length > 0) {
      const totalSavings = tokenOpts.reduce((s, o) => s + o.savingsPercent, 0) / tokenOpts.length;
      findings.push(`${tokenOpts.length}箇所のトークン最適化機会があります（平均${Math.round(totalSavings)}%削減可能）。`);
      score -= 10;
      for (const opt of tokenOpts) {
        recommendations.push(
          `ノードのモデルを${opt.currentModelId}から${opt.suggestedModelId}に切り替えることで${opt.savingsPercent}%のコスト削減が可能です。`
        );
      }
    }

    const flagshipNodes = workflow.nodes.filter((n) => {
      const model = resolveLLMModel(n.nodeTypeId);
      return model?.tier === 'flagship';
    });
    if (flagshipNodes.length > 1) {
      score -= 15;
      findings.push(`Flagshipモデルが${flagshipNodes.length}ノードで使用されています。`);
      recommendations.push('全てのタスクにFlagshipモデルが必要か見直してください。分類・抽出タスクにはFastティアで十分な場合があります。');
    }

    if (costEstimate.perExecutionCost.totalUsd > 0.1) {
      score -= 10;
      recommendations.push('1回あたりのコストが$0.10を超えています。プロンプトの最適化やモデルの見直しを検討してください。');
    }

    for (const rec of costEstimate.recommendations) {
      recommendations.push(rec);
    }

    categories.push({
      category: 'コスト最適化',
      score: Math.max(0, Math.min(100, score)),
      grade: scoreToGrade(Math.max(0, Math.min(100, score))),
      findings,
      recommendations,
    });
  }

  // --- 3. Error Handling Coverage ---
  {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const nonLogicNodes = workflow.nodes.filter((n) => {
      const t = resolveNodeType(n.nodeTypeId);
      return t && t.category !== 'logic' && t.category !== 'trigger';
    });
    const nodesWithErrorHandling = nonLogicNodes.filter((n) => n.errorHandlingPatternId);
    const coverage = nonLogicNodes.length > 0 ? nodesWithErrorHandling.length / nonLogicNodes.length : 1;

    findings.push(`エラーハンドリングカバレッジ: ${Math.round(coverage * 100)}%（${nodesWithErrorHandling.length}/${nonLogicNodes.length}ノード）`);

    if (coverage < 1) {
      score -= Math.round((1 - coverage) * 40);
      const uncoveredNodes = nonLogicNodes.filter((n) => !n.errorHandlingPatternId);
      recommendations.push(
        `以下のノードにエラーハンドリングを追加してください: ${uncoveredNodes.map((n) => n.label).join(', ')}`
      );
    }

    // Check for critical nodes without error handling
    const llmNodesWithout = workflow.nodes.filter(
      (n) => resolveNodeType(n.nodeTypeId)?.category === 'llm' && !n.errorHandlingPatternId
    );
    if (llmNodesWithout.length > 0) {
      score -= 15;
      findings.push(`${llmNodesWithout.length}個のLLMノードにエラーハンドリングが未設定です。`);
      recommendations.push('LLMノードにはリトライ（指数バックオフ）またはモデルフォールバックの設定を必ず行ってください。');
    }

    const outputNodesWithout = workflow.nodes.filter(
      (n) => resolveNodeType(n.nodeTypeId)?.category === 'output' && !n.errorHandlingPatternId
    );
    if (outputNodesWithout.length > 0) {
      score -= 10;
      findings.push(`${outputNodesWithout.length}個の出力ノードにエラーハンドリングが未設定です。`);
      recommendations.push('出力ノードにはリトライとデッドレターキューの設定を推奨します。');
    }

    const reliability = calculateReliability(workflow, {});
    findings.push(`推定全体信頼性: ${Math.round(reliability.overallReliability * 100)}%`);
    if (reliability.overallReliability < 0.95) {
      score -= 10;
    }

    categories.push({
      category: 'エラーハンドリング',
      score: Math.max(0, Math.min(100, score)),
      grade: scoreToGrade(Math.max(0, Math.min(100, score))),
      findings,
      recommendations,
    });
  }

  // --- 4. Scalability Assessment ---
  {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const benchmark = benchmarkPerformance(workflow);
    findings.push(`パフォーマンスグレード: ${benchmark.grade}`);
    findings.push(`P50レイテンシ: ${benchmark.p50LatencyMs}ms`);
    findings.push(`最大スループット: ${benchmark.throughputPerMinute}回/分`);

    if (benchmark.p50LatencyMs > 30000) {
      score -= 25;
      recommendations.push('レイテンシが30秒を超えています。高速モデルの採用または処理の並列化を検討してください。');
    } else if (benchmark.p50LatencyMs > 15000) {
      score -= 10;
      recommendations.push('レイテンシが15秒を超えています。ユーザー向けリアルタイム処理には不向きな可能性があります。');
    }

    if (benchmark.throughputPerMinute < 10) {
      score -= 15;
      recommendations.push(`スループットが${benchmark.throughputPerMinute}回/分に制限されています。並列処理やキューの導入を検討してください。`);
    }

    if (benchmark.concurrencyLimit < 10) {
      score -= 10;
      findings.push(`同時実行制限: ${benchmark.concurrencyLimit}`);
      recommendations.push('同時実行数が低いため、高負荷時のキューイング戦略が必要です。');
    }

    const bottlenecks = detectBottlenecks(workflow);
    if (bottlenecks.length > 0) {
      const criticalBottlenecks = bottlenecks.filter((b) => b.severity === 'critical' || b.severity === 'high');
      if (criticalBottlenecks.length > 0) {
        score -= criticalBottlenecks.length * 10;
        findings.push(`${criticalBottlenecks.length}件の重大なボトルネックが検出されました。`);
        for (const b of criticalBottlenecks) {
          recommendations.push(b.suggestion);
        }
      }
    }

    categories.push({
      category: 'スケーラビリティ',
      score: Math.max(0, Math.min(100, score)),
      grade: scoreToGrade(Math.max(0, Math.min(100, score))),
      findings,
      recommendations,
    });
  }

  // --- 5. Security Review ---
  {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check for webhook security
    const webhookTriggers = workflow.nodes.filter((n) => n.nodeTypeId === 'trigger_webhook');
    for (const wh of webhookTriggers) {
      if (!wh.config.secret) {
        score -= 20;
        findings.push('Webhookトリガーに認証シークレットが設定されていません。');
        recommendations.push('Webhookエンドポイントには必ずHMAC署名検証用のシークレットを設定してください。');
      }
    }

    // Check for API nodes with potential credential exposure
    const apiNodes = workflow.nodes.filter((n) => n.nodeTypeId === 'tool_api_call');
    if (apiNodes.length > 0) {
      findings.push(`${apiNodes.length}個の外部API呼び出しノードがあります。`);
      recommendations.push('APIキーは環境変数で管理し、ワークフロー設定にハードコードしないでください。');
      // Check for hardcoded URLs that might contain credentials
      for (const api of apiNodes) {
        if (typeof api.config.url === 'string' && (api.config.url as string).includes('key=')) {
          score -= 25;
          findings.push('APIのURLにクエリパラメータとして認証情報が含まれている可能性があります。');
          recommendations.push('認証情報はHTTPヘッダー（Authorization）で送信してください。URLにキーを含めないでください。');
        }
      }
    }

    // Check for DB nodes with parameterized queries
    const dbNodes = workflow.nodes.filter((n) => n.nodeTypeId === 'tool_db_query');
    for (const db of dbNodes) {
      if (db.config.parameterized === false) {
        score -= 20;
        findings.push('パラメータ化されていないSQLクエリがあります。SQLインジェクションのリスクがあります。');
        recommendations.push('全てのデータベースクエリをパラメータ化してください。');
      }
    }

    // Check for LLM prompt injection vectors
    const llmNodes = workflow.nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'llm');
    if (llmNodes.length > 0 && webhookTriggers.length > 0) {
      findings.push('外部入力がLLMノードに到達する経路があります。プロンプトインジェクションのリスクを考慮してください。');
      recommendations.push('外部入力は必ずサニタイズし、システムプロンプトとユーザー入力を分離してください。');
      score -= 5;
    }

    // Check for sensitive data in output nodes
    const outputNodes = workflow.nodes.filter((n) => resolveNodeType(n.nodeTypeId)?.category === 'output');
    if (outputNodes.length > 0 && llmNodes.length > 0) {
      recommendations.push('LLMの出力を外部に送信する前に、個人情報（PII）のフィルタリングを検討してください。');
    }

    if (findings.length === 0) {
      findings.push('明らかなセキュリティ問題は検出されませんでした。');
    }

    categories.push({
      category: 'セキュリティ',
      score: Math.max(0, Math.min(100, score)),
      grade: scoreToGrade(Math.max(0, Math.min(100, score))),
      findings,
      recommendations,
    });
  }

  // Calculate overall score
  const overallScore = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    categories,
    timestamp: new Date().toISOString(),
  };
}
