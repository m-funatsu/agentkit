// =============================================================================
// AgentKit Master Data - AI Agent Workflow Reference Data
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Node Types (ノード種類)
// -----------------------------------------------------------------------------

export interface NodeTypeDefinition {
  id: string;
  category: 'trigger' | 'llm' | 'tool' | 'logic' | 'output';
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  color: string;
  configSchema: Record<string, ConfigField>;
  avgLatencyMs: number;
  costPerExecution: number; // USD
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'json';
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
}

export const NODE_TYPES: NodeTypeDefinition[] = [
  // --- Trigger Nodes ---
  {
    id: 'trigger_webhook',
    category: 'trigger',
    name: 'Webhook受信',
    nameEn: 'Webhook',
    description: '外部サービスからのHTTPリクエストでワークフローを開始します。',
    icon: '🔗',
    color: '#6366f1',
    configSchema: {
      method: { type: 'select', label: 'HTTPメソッド', required: true, defaultValue: 'POST', options: ['GET', 'POST', 'PUT'] },
      path: { type: 'string', label: 'エンドポイントパス', required: true, defaultValue: '/webhook' },
      secret: { type: 'string', label: '認証シークレット', required: false },
    },
    avgLatencyMs: 50,
    costPerExecution: 0,
  },
  {
    id: 'trigger_schedule',
    category: 'trigger',
    name: 'スケジュール実行',
    nameEn: 'Schedule',
    description: 'cron式または定期間隔でワークフローを自動実行します。',
    icon: '⏰',
    color: '#8b5cf6',
    configSchema: {
      cronExpression: { type: 'string', label: 'Cron式', required: true, defaultValue: '0 9 * * 1' },
      timezone: { type: 'string', label: 'タイムゾーン', required: true, defaultValue: 'Asia/Tokyo' },
    },
    avgLatencyMs: 0,
    costPerExecution: 0,
  },
  {
    id: 'trigger_manual',
    category: 'trigger',
    name: '手動実行',
    nameEn: 'Manual',
    description: 'ユーザーがボタンクリックでワークフローを開始します。',
    icon: '👆',
    color: '#a855f7',
    configSchema: {
      confirmRequired: { type: 'boolean', label: '実行前確認', required: false, defaultValue: true },
    },
    avgLatencyMs: 0,
    costPerExecution: 0,
  },

  // --- LLM Nodes ---
  {
    id: 'llm_claude_opus',
    category: 'llm',
    name: 'Claude Opus',
    nameEn: 'Claude Opus',
    description: '最高品質の推論。複雑な分析、コード生成、戦略立案に最適。',
    icon: '🧠',
    color: '#d97706',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 4096 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.7 },
    },
    avgLatencyMs: 8000,
    costPerExecution: 0.075,
  },
  {
    id: 'llm_claude_sonnet',
    category: 'llm',
    name: 'Claude Sonnet',
    nameEn: 'Claude Sonnet',
    description: '高品質とスピードのバランス。汎用的なタスクに最適。',
    icon: '🧠',
    color: '#d97706',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 4096 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.7 },
    },
    avgLatencyMs: 3000,
    costPerExecution: 0.015,
  },
  {
    id: 'llm_claude_haiku',
    category: 'llm',
    name: 'Claude Haiku',
    nameEn: 'Claude Haiku',
    description: '高速・低コスト。分類、抽出、簡単な変換に最適。',
    icon: '🧠',
    color: '#d97706',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 2048 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.5 },
    },
    avgLatencyMs: 800,
    costPerExecution: 0.001,
  },
  {
    id: 'llm_gpt4o',
    category: 'llm',
    name: 'GPT-4o',
    nameEn: 'GPT-4o',
    description: 'OpenAIの最新マルチモーダルモデル。画像入力対応。',
    icon: '🤖',
    color: '#10b981',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 4096 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.7 },
    },
    avgLatencyMs: 4000,
    costPerExecution: 0.025,
  },
  {
    id: 'llm_gpt4o_mini',
    category: 'llm',
    name: 'GPT-4o mini',
    nameEn: 'GPT-4o mini',
    description: '高速・低コストのOpenAIモデル。軽量タスクに最適。',
    icon: '🤖',
    color: '#10b981',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 2048 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.7 },
    },
    avgLatencyMs: 1500,
    costPerExecution: 0.003,
  },
  {
    id: 'llm_gemini_pro',
    category: 'llm',
    name: 'Gemini Pro',
    nameEn: 'Gemini Pro',
    description: 'Googleの高性能モデル。長文コンテキストと推論に強い。',
    icon: '💎',
    color: '#4285f4',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 4096 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.7 },
    },
    avgLatencyMs: 3500,
    costPerExecution: 0.018,
  },
  {
    id: 'llm_gemini_flash',
    category: 'llm',
    name: 'Gemini Flash',
    nameEn: 'Gemini Flash',
    description: 'Google最速モデル。リアルタイム処理と分類に最適。',
    icon: '💎',
    color: '#4285f4',
    configSchema: {
      systemPrompt: { type: 'string', label: 'システムプロンプト', required: true },
      maxTokens: { type: 'number', label: '最大トークン数', required: false, defaultValue: 2048 },
      temperature: { type: 'number', label: 'Temperature', required: false, defaultValue: 0.5 },
    },
    avgLatencyMs: 600,
    costPerExecution: 0.0005,
  },

  // --- Tool Nodes ---
  {
    id: 'tool_api_call',
    category: 'tool',
    name: 'API呼び出し',
    nameEn: 'API Call',
    description: '外部REST APIにリクエストを送信し、レスポンスを取得します。',
    icon: '🌐',
    color: '#0ea5e9',
    configSchema: {
      url: { type: 'string', label: 'エンドポイントURL', required: true },
      method: { type: 'select', label: 'HTTPメソッド', required: true, defaultValue: 'GET', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
      headers: { type: 'json', label: 'リクエストヘッダー', required: false },
      body: { type: 'json', label: 'リクエストボディ', required: false },
      timeoutMs: { type: 'number', label: 'タイムアウト(ms)', required: false, defaultValue: 30000 },
    },
    avgLatencyMs: 2000,
    costPerExecution: 0,
  },
  {
    id: 'tool_db_query',
    category: 'tool',
    name: 'データベースクエリ',
    nameEn: 'Database Query',
    description: 'データベースにクエリを実行し、結果を取得します。',
    icon: '🗄️',
    color: '#0891b2',
    configSchema: {
      connectionId: { type: 'string', label: '接続ID', required: true },
      query: { type: 'string', label: 'SQLクエリ', required: true },
      parameterized: { type: 'boolean', label: 'パラメータ化クエリ', required: false, defaultValue: true },
    },
    avgLatencyMs: 500,
    costPerExecution: 0,
  },
  {
    id: 'tool_file_operation',
    category: 'tool',
    name: 'ファイル操作',
    nameEn: 'File Operation',
    description: 'ファイルの読み取り、書き込み、変換を行います。',
    icon: '📁',
    color: '#0d9488',
    configSchema: {
      operation: { type: 'select', label: '操作種別', required: true, defaultValue: 'read', options: ['read', 'write', 'append', 'transform'] },
      path: { type: 'string', label: 'ファイルパス', required: true },
      format: { type: 'select', label: 'フォーマット', required: false, defaultValue: 'json', options: ['json', 'csv', 'text', 'pdf'] },
    },
    avgLatencyMs: 300,
    costPerExecution: 0,
  },

  // --- Logic Nodes ---
  {
    id: 'logic_condition',
    category: 'logic',
    name: '条件分岐',
    nameEn: 'Condition',
    description: '条件式を評価し、TRUEまたはFALSEの分岐先にルーティングします。',
    icon: '🔀',
    color: '#f59e0b',
    configSchema: {
      condition: { type: 'string', label: '条件式', required: true },
      trueBranch: { type: 'string', label: 'TRUE時の接続先', required: true },
      falseBranch: { type: 'string', label: 'FALSE時の接続先', required: true },
    },
    avgLatencyMs: 10,
    costPerExecution: 0,
  },
  {
    id: 'logic_loop',
    category: 'logic',
    name: 'ループ',
    nameEn: 'Loop',
    description: '配列データに対して反復処理を実行します。',
    icon: '🔁',
    color: '#eab308',
    configSchema: {
      iteratorSource: { type: 'string', label: 'イテレータソース', required: true },
      maxIterations: { type: 'number', label: '最大反復回数', required: false, defaultValue: 100 },
      concurrency: { type: 'number', label: '同時実行数', required: false, defaultValue: 1 },
    },
    avgLatencyMs: 5,
    costPerExecution: 0,
  },
  {
    id: 'logic_wait',
    category: 'logic',
    name: '待機',
    nameEn: 'Wait',
    description: '指定時間の待機、または外部イベントの到着を待ちます。',
    icon: '⏸️',
    color: '#f97316',
    configSchema: {
      waitType: { type: 'select', label: '待機種別', required: true, defaultValue: 'duration', options: ['duration', 'event', 'approval'] },
      durationMs: { type: 'number', label: '待機時間(ms)', required: false, defaultValue: 5000 },
      timeoutMs: { type: 'number', label: 'タイムアウト(ms)', required: false, defaultValue: 86400000 },
    },
    avgLatencyMs: 5000,
    costPerExecution: 0,
  },

  // --- Output Nodes ---
  {
    id: 'output_email',
    category: 'output',
    name: 'メール送信',
    nameEn: 'Send Email',
    description: 'SMTPまたはAPI経由でメールを送信します。',
    icon: '📧',
    color: '#ef4444',
    configSchema: {
      to: { type: 'string', label: '宛先', required: true },
      subject: { type: 'string', label: '件名', required: true },
      templateId: { type: 'string', label: 'テンプレートID', required: false },
    },
    avgLatencyMs: 1500,
    costPerExecution: 0.001,
  },
  {
    id: 'output_slack',
    category: 'output',
    name: 'Slack通知',
    nameEn: 'Slack Notification',
    description: 'Slackチャンネルまたはユーザーにメッセージを送信します。',
    icon: '💬',
    color: '#e11d48',
    configSchema: {
      channel: { type: 'string', label: 'チャンネル', required: true, defaultValue: '#general' },
      mentionUsers: { type: 'string', label: 'メンション対象', required: false },
    },
    avgLatencyMs: 800,
    costPerExecution: 0,
  },
  {
    id: 'output_webhook',
    category: 'output',
    name: 'Webhook送信',
    nameEn: 'Webhook Send',
    description: '外部サービスにHTTPリクエストで結果を送信します。',
    icon: '📤',
    color: '#dc2626',
    configSchema: {
      url: { type: 'string', label: '送信先URL', required: true },
      method: { type: 'select', label: 'HTTPメソッド', required: true, defaultValue: 'POST', options: ['POST', 'PUT', 'PATCH'] },
      retryCount: { type: 'number', label: 'リトライ回数', required: false, defaultValue: 3 },
    },
    avgLatencyMs: 1000,
    costPerExecution: 0,
  },
];

export const NODE_CATEGORIES: Record<NodeTypeDefinition['category'], { label: string; description: string }> = {
  trigger: { label: 'トリガー', description: 'ワークフローの開始条件を定義' },
  llm: { label: 'LLMモデル', description: 'AIによるテキスト生成・判断・分析' },
  tool: { label: 'ツール', description: '外部サービスやデータへのアクセス' },
  logic: { label: 'ロジック', description: 'フロー制御と条件分岐' },
  output: { label: '出力', description: '結果の送信・通知' },
};

// -----------------------------------------------------------------------------
// 2. Workflow Templates (ワークフローテンプレート)
// -----------------------------------------------------------------------------

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  color: string;
  estimatedCostPerRun: number; // USD
  avgExecutionTimeMs: number;
  nodeSequence: string[]; // references NODE_TYPES[].id
  tags: string[];
  useCases: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wft_customer_support',
    name: 'カスタマーサポート自動応答',
    nameEn: 'Customer Support Auto-Response',
    description: '受信した問い合わせをAIで分類し、FAQ回答を自動生成。解決困難な場合は人間にエスカレーション。',
    category: 'サポート',
    difficulty: 'intermediate',
    icon: '🎧',
    color: '#6366f1',
    estimatedCostPerRun: 0.018,
    avgExecutionTimeMs: 5500,
    nodeSequence: ['trigger_webhook', 'llm_claude_sonnet', 'logic_condition', 'llm_claude_haiku', 'output_email', 'output_slack'],
    tags: ['カスタマーサポート', '自動応答', 'エスカレーション'],
    useCases: [
      '問い合わせメールの自動分類と一次回答',
      'FAQベースの自動応答システム',
      '緊急度に応じた担当者エスカレーション',
    ],
  },
  {
    id: 'wft_content_pipeline',
    name: 'コンテンツ生成パイプライン',
    nameEn: 'Content Generation Pipeline',
    description: 'テーマ入力からSEO対策済みの記事を自動生成。構成案、下書き、校正を段階的に実行。',
    category: 'コンテンツ',
    difficulty: 'advanced',
    icon: '✍️',
    color: '#f97316',
    estimatedCostPerRun: 0.12,
    avgExecutionTimeMs: 25000,
    nodeSequence: ['trigger_manual', 'llm_claude_sonnet', 'llm_claude_opus', 'llm_claude_haiku', 'tool_file_operation', 'output_slack'],
    tags: ['コンテンツ生成', 'SEO', 'ブログ', '記事作成'],
    useCases: [
      'SEO対策記事の自動生成',
      'メルマガコンテンツの定期作成',
      'SNS投稿の一括下書き作成',
    ],
  },
  {
    id: 'wft_data_analysis_report',
    name: 'データ分析レポート',
    nameEn: 'Data Analysis Report',
    description: 'データソースからデータを取得し、AIで分析・可視化レポートを生成して関係者に配信。',
    category: '分析',
    difficulty: 'advanced',
    icon: '📊',
    color: '#10b981',
    estimatedCostPerRun: 0.045,
    avgExecutionTimeMs: 15000,
    nodeSequence: ['trigger_schedule', 'tool_db_query', 'llm_claude_sonnet', 'tool_file_operation', 'output_email'],
    tags: ['データ分析', 'レポート', '自動集計', 'KPI'],
    useCases: [
      '週次KPIレポートの自動生成',
      '売上データのトレンド分析',
      '異常検知とアラート配信',
    ],
  },
  {
    id: 'wft_code_review_bot',
    name: 'コードレビューBot',
    nameEn: 'Code Review Bot',
    description: 'GitHubのPRをWebhookで検知し、AIがコードレビューを実行。改善提案をPRコメントとして投稿。',
    category: '開発',
    difficulty: 'intermediate',
    icon: '🔍',
    color: '#8b5cf6',
    estimatedCostPerRun: 0.035,
    avgExecutionTimeMs: 12000,
    nodeSequence: ['trigger_webhook', 'tool_api_call', 'llm_claude_opus', 'logic_condition', 'tool_api_call', 'output_slack'],
    tags: ['コードレビュー', 'GitHub', 'CI/CD', '品質管理'],
    useCases: [
      'PRの自動コードレビュー',
      'セキュリティ脆弱性の自動検出',
      'コーディング規約違反の指摘',
    ],
  },
  {
    id: 'wft_document_summary',
    name: 'ドキュメント要約',
    nameEn: 'Document Summary',
    description: 'PDF/テキストファイルを読み込み、AIで要約を生成。要点をSlackやメールで共有。',
    category: 'ドキュメント',
    difficulty: 'beginner',
    icon: '📄',
    color: '#06b6d4',
    estimatedCostPerRun: 0.008,
    avgExecutionTimeMs: 6000,
    nodeSequence: ['trigger_manual', 'tool_file_operation', 'llm_claude_haiku', 'output_slack'],
    tags: ['要約', 'ドキュメント', 'PDF', 'ナレッジ管理'],
    useCases: [
      '長文レポートの要約生成',
      '契約書の要点抽出',
      '会議資料の事前サマリー作成',
    ],
  },
];

// -----------------------------------------------------------------------------
// 3. LLM Model Comparison (LLMモデル比較)
// -----------------------------------------------------------------------------

export interface LLMModelSpec {
  id: string;
  provider: 'anthropic' | 'openai' | 'google';
  name: string;
  tier: 'flagship' | 'balanced' | 'fast';
  inputCostPer1kTokens: number;  // USD
  outputCostPer1kTokens: number; // USD
  maxContextTokens: number;
  maxOutputTokens: number;
  avgLatencyMs: number;
  qualityScore: number;     // 1-10
  speedScore: number;       // 1-10
  costEfficiencyScore: number; // 1-10
  strengths: string[];
  bestFor: string[];
}

export const LLM_MODELS: LLMModelSpec[] = [
  {
    id: 'claude-opus-4',
    provider: 'anthropic',
    name: 'Claude Opus 4',
    tier: 'flagship',
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    maxContextTokens: 200000,
    maxOutputTokens: 32000,
    avgLatencyMs: 8000,
    qualityScore: 10,
    speedScore: 4,
    costEfficiencyScore: 3,
    strengths: ['最高品質の推論', '複雑なコード生成', '長文コンテキスト理解'],
    bestFor: ['戦略分析', 'コードレビュー', '複雑な文書作成'],
  },
  {
    id: 'claude-sonnet-4',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    tier: 'balanced',
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    maxContextTokens: 200000,
    maxOutputTokens: 16000,
    avgLatencyMs: 3000,
    qualityScore: 8,
    speedScore: 7,
    costEfficiencyScore: 8,
    strengths: ['バランスの良い性能', '高速レスポンス', 'コスト効率'],
    bestFor: ['汎用タスク', 'カスタマーサポート', 'コンテンツ生成'],
  },
  {
    id: 'claude-haiku-3.5',
    provider: 'anthropic',
    name: 'Claude Haiku 3.5',
    tier: 'fast',
    inputCostPer1kTokens: 0.0008,
    outputCostPer1kTokens: 0.004,
    maxContextTokens: 200000,
    maxOutputTokens: 8192,
    avgLatencyMs: 800,
    qualityScore: 6,
    speedScore: 10,
    costEfficiencyScore: 10,
    strengths: ['最速レスポンス', '最低コスト', '大量処理向き'],
    bestFor: ['分類タスク', 'データ抽出', 'バリデーション'],
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    tier: 'flagship',
    inputCostPer1kTokens: 0.005,
    outputCostPer1kTokens: 0.015,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    avgLatencyMs: 4000,
    qualityScore: 9,
    speedScore: 6,
    costEfficiencyScore: 6,
    strengths: ['マルチモーダル対応', '画像理解', '関数呼び出し'],
    bestFor: ['画像分析', 'マルチモーダルタスク', 'ツール連携'],
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o mini',
    tier: 'fast',
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.0006,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    avgLatencyMs: 1500,
    qualityScore: 7,
    speedScore: 8,
    costEfficiencyScore: 9,
    strengths: ['超低コスト', '高速処理', '十分な品質'],
    bestFor: ['大量バッチ処理', '簡単な分類', 'プロトタイピング'],
  },
  {
    id: 'gemini-2.0-pro',
    provider: 'google',
    name: 'Gemini 2.0 Pro',
    tier: 'flagship',
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.005,
    maxContextTokens: 2000000,
    maxOutputTokens: 8192,
    avgLatencyMs: 3500,
    qualityScore: 8,
    speedScore: 7,
    costEfficiencyScore: 7,
    strengths: ['超長文コンテキスト', 'コード生成', 'マルチモーダル'],
    bestFor: ['長文分析', 'コードベース理解', 'ドキュメント処理'],
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    tier: 'fast',
    inputCostPer1kTokens: 0.0001,
    outputCostPer1kTokens: 0.0004,
    maxContextTokens: 1000000,
    maxOutputTokens: 8192,
    avgLatencyMs: 600,
    qualityScore: 6,
    speedScore: 10,
    costEfficiencyScore: 10,
    strengths: ['最速クラス', '超低コスト', '長文対応'],
    bestFor: ['リアルタイム処理', '大量分類', 'ストリーミング'],
  },
];

// -----------------------------------------------------------------------------
// 4. Error Handling Patterns (エラーハンドリングパターン)
// -----------------------------------------------------------------------------

export interface ErrorHandlingPattern {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  strategy: 'retry' | 'fallback' | 'timeout' | 'human_intervention' | 'circuit_breaker' | 'dead_letter';
  defaultConfig: Record<string, number | string | boolean>;
  applicableNodeTypes: NodeTypeDefinition['category'][];
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const ERROR_HANDLING_PATTERNS: ErrorHandlingPattern[] = [
  {
    id: 'err_retry_exponential',
    name: '指数バックオフリトライ',
    nameEn: 'Exponential Backoff Retry',
    description: '失敗時に待機時間を指数的に増やしながらリトライします。一時的な障害に有効。',
    strategy: 'retry',
    defaultConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: 'timeout,rate_limit,server_error',
    },
    applicableNodeTypes: ['llm', 'tool', 'output'],
    severityLevel: 'medium',
  },
  {
    id: 'err_fallback_model',
    name: 'モデルフォールバック',
    nameEn: 'Model Fallback',
    description: 'プライマリLLMが失敗した場合、代替モデルに自動切り替えします。',
    strategy: 'fallback',
    defaultConfig: {
      primaryModel: 'claude-sonnet-4',
      fallbackModel: 'gpt-4o-mini',
      lastResortModel: 'gemini-2.0-flash',
      switchOnErrors: 'timeout,rate_limit,model_overloaded',
    },
    applicableNodeTypes: ['llm'],
    severityLevel: 'high',
  },
  {
    id: 'err_timeout_guard',
    name: 'タイムアウトガード',
    nameEn: 'Timeout Guard',
    description: '指定時間内に完了しない場合、処理を中断しフォールバックを実行します。',
    strategy: 'timeout',
    defaultConfig: {
      timeoutMs: 30000,
      softTimeoutMs: 20000,
      onTimeout: 'fallback',
      logLevel: 'warn',
    },
    applicableNodeTypes: ['llm', 'tool', 'output'],
    severityLevel: 'medium',
  },
  {
    id: 'err_human_escalation',
    name: '人間介入エスカレーション',
    nameEn: 'Human Intervention Escalation',
    description: '自動処理で解決できない場合、人間の承認・判断を要求します。',
    strategy: 'human_intervention',
    defaultConfig: {
      notifyChannel: 'slack',
      waitTimeoutMs: 86400000,
      escalationLevel: 'team_lead',
      autoResolveAfter: 'skip',
    },
    applicableNodeTypes: ['llm', 'logic', 'output'],
    severityLevel: 'critical',
  },
  {
    id: 'err_circuit_breaker',
    name: 'サーキットブレーカー',
    nameEn: 'Circuit Breaker',
    description: '連続失敗が閾値を超えた場合、一定期間リクエストを遮断して過負荷を防ぎます。',
    strategy: 'circuit_breaker',
    defaultConfig: {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      halfOpenRequests: 1,
      monitorWindowMs: 120000,
    },
    applicableNodeTypes: ['llm', 'tool', 'output'],
    severityLevel: 'high',
  },
  {
    id: 'err_dead_letter',
    name: 'デッドレターキュー',
    nameEn: 'Dead Letter Queue',
    description: '全てのリトライが失敗した場合、メッセージをデッドレターキューに保存して後で再処理可能にします。',
    strategy: 'dead_letter',
    defaultConfig: {
      queueName: 'workflow_dlq',
      retentionDays: 30,
      alertOnEnqueue: true,
      autoRetrySchedule: 'daily',
    },
    applicableNodeTypes: ['llm', 'tool', 'output'],
    severityLevel: 'high',
  },
];

// -----------------------------------------------------------------------------
// 5. Cost Calculation Parameters (コスト計算パラメータ)
// -----------------------------------------------------------------------------

export interface CostParameter {
  id: string;
  category: 'token' | 'api_call' | 'execution_time' | 'storage' | 'bandwidth';
  name: string;
  unit: string;
  unitCostUsd: number;
  unitCostJpy: number;
  description: string;
}

export const COST_PARAMETERS: CostParameter[] = [
  // Token costs
  {
    id: 'cost_input_token_premium',
    category: 'token',
    name: '入力トークン (Flagship)',
    unit: '1Kトークン',
    unitCostUsd: 0.015,
    unitCostJpy: 2.25,
    description: 'Claude Opus / GPT-4oクラスの入力トークン単価',
  },
  {
    id: 'cost_input_token_standard',
    category: 'token',
    name: '入力トークン (Balanced)',
    unit: '1Kトークン',
    unitCostUsd: 0.003,
    unitCostJpy: 0.45,
    description: 'Claude Sonnet / Gemini Proクラスの入力トークン単価',
  },
  {
    id: 'cost_input_token_economy',
    category: 'token',
    name: '入力トークン (Fast)',
    unit: '1Kトークン',
    unitCostUsd: 0.0005,
    unitCostJpy: 0.075,
    description: 'Claude Haiku / GPT-4o mini / Gemini Flashクラスの入力トークン単価',
  },
  {
    id: 'cost_output_token_premium',
    category: 'token',
    name: '出力トークン (Flagship)',
    unit: '1Kトークン',
    unitCostUsd: 0.075,
    unitCostJpy: 11.25,
    description: 'Claude Opus / GPT-4oクラスの出力トークン単価',
  },
  {
    id: 'cost_output_token_standard',
    category: 'token',
    name: '出力トークン (Balanced)',
    unit: '1Kトークン',
    unitCostUsd: 0.015,
    unitCostJpy: 2.25,
    description: 'Claude Sonnet / Gemini Proクラスの出力トークン単価',
  },
  {
    id: 'cost_output_token_economy',
    category: 'token',
    name: '出力トークン (Fast)',
    unit: '1Kトークン',
    unitCostUsd: 0.002,
    unitCostJpy: 0.30,
    description: 'Claude Haiku / GPT-4o mini / Gemini Flashクラスの出力トークン単価',
  },

  // API call costs
  {
    id: 'cost_api_call_external',
    category: 'api_call',
    name: '外部API呼び出し',
    unit: '1リクエスト',
    unitCostUsd: 0,
    unitCostJpy: 0,
    description: '外部API呼び出し自体のプラットフォーム課金（API先の課金は別途）',
  },
  {
    id: 'cost_email_send',
    category: 'api_call',
    name: 'メール送信',
    unit: '1通',
    unitCostUsd: 0.001,
    unitCostJpy: 0.15,
    description: 'SendGrid/SES経由のメール送信単価',
  },
  {
    id: 'cost_slack_message',
    category: 'api_call',
    name: 'Slack通知',
    unit: '1メッセージ',
    unitCostUsd: 0,
    unitCostJpy: 0,
    description: 'Slack APIは無料（レートリミットあり）',
  },

  // Execution time costs
  {
    id: 'cost_compute_time',
    category: 'execution_time',
    name: 'コンピュート時間',
    unit: '1秒',
    unitCostUsd: 0.00001,
    unitCostJpy: 0.0015,
    description: 'ワークフローエンジンの実行時間課金',
  },

  // Storage costs
  {
    id: 'cost_log_storage',
    category: 'storage',
    name: 'ログ保存',
    unit: '1GB/月',
    unitCostUsd: 0.023,
    unitCostJpy: 3.45,
    description: '実行ログの保存ストレージ費用',
  },
];

export const USD_TO_JPY_RATE = 150;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

export function getNodesByCategory(category: NodeTypeDefinition['category']): NodeTypeDefinition[] {
  return NODE_TYPES.filter((n) => n.category === category);
}

export function getNodeById(id: string): NodeTypeDefinition | undefined {
  return NODE_TYPES.find((n) => n.id === id);
}

export function getLLMModelById(id: string): LLMModelSpec | undefined {
  return LLM_MODELS.find((m) => m.id === id);
}

export function getLLMModelsByProvider(provider: LLMModelSpec['provider']): LLMModelSpec[] {
  return LLM_MODELS.filter((m) => m.provider === provider);
}

export function getLLMModelsByTier(tier: LLMModelSpec['tier']): LLMModelSpec[] {
  return LLM_MODELS.filter((m) => m.tier === tier);
}

export function getErrorPatternsForNodeType(category: NodeTypeDefinition['category']): ErrorHandlingPattern[] {
  return ERROR_HANDLING_PATTERNS.filter((p) => p.applicableNodeTypes.includes(category));
}

export function getCostParametersByCategory(category: CostParameter['category']): CostParameter[] {
  return COST_PARAMETERS.filter((p) => p.category === category);
}
