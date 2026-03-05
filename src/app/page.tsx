import Link from 'next/link';

const FEATURES = [
  {
    icon: '🤖',
    title: 'ノーコードで構築',
    description: 'プログラミング不要。テンプレートを選んでカスタマイズするだけでAIエージェントが完成します。',
  },
  {
    icon: '🧠',
    title: 'AI Brain設定',
    description: '自然言語でAIの性格や判断基準を定義。あなたのビジネスに最適化されたAIが動きます。',
  },
  {
    icon: '⚡',
    title: 'ワークフロー自動化',
    description: 'トリガー、AI判断、アクションを組み合わせて、日々の業務を自動化します。',
  },
  {
    icon: '📊',
    title: '実行ログ管理',
    description: '全ての実行結果を記録・可視化。エラーの追跡やパフォーマンスの改善に役立ちます。',
  },
] as const;

const TEMPLATES_PREVIEW = [
  { icon: '🤝', name: 'クライアントオンボーディング', category: 'クライアント管理' },
  { icon: '💰', name: '請求リマインダー', category: '請求・見積' },
  { icon: '📊', name: 'プロジェクト進捗レポート', category: 'プロジェクト管理' },
  { icon: '📅', name: 'MTGスケジューラー', category: 'スケジュール' },
  { icon: '📨', name: 'メール自動分類', category: 'コミュニケーション' },
  { icon: '✍️', name: 'コンテンツスケジューラー', category: 'コンテンツ' },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="px-4 pb-16 pt-12 text-center" data-testid="landing-hero">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
            フリーランスのための AI 自動化
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            AgentKit
            <span className="block text-xl font-normal text-gray-500 mt-2">エージェントキット</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            ノーコードでAIエージェントを構築し、フリーランス業務を自動化。
            クライアント対応、請求管理、レポート作成を任せて、本業に集中しましょう。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-xl"
              data-testid="cta-dashboard"
            >
              ダッシュボードを開く
            </Link>
            <Link
              href="/builder"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
              data-testid="cta-builder"
            >
              エージェントを作成
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-12" data-testid="landing-features">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">AIエージェントで業務を自動化</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="mt-3 text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-12" data-testid="landing-templates">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">すぐに使えるテンプレート</h2>
          <p className="mb-8 text-center text-sm text-gray-500">豊富なテンプレートから選んで、すぐにAIエージェントを稼働できます</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES_PREVIEW.map((t) => (
              <div key={t.name} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center" data-testid="landing-cta">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">今すぐAIエージェントを始めよう</h2>
          <p className="mb-6 text-sm text-gray-600">無料で始められます。クレジットカード不要。</p>
          <Link href="/builder" className="inline-block rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700">
            無料で始める
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 px-4 py-6 text-center text-xs text-gray-500">
        <p>AgentKit - フリーランスのためのAIエージェントビルダー</p>
      </footer>
    </div>
  );
}
