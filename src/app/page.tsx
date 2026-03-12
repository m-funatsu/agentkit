import Link from 'next/link';
import { Bot, Brain, Zap, BarChart3, Handshake, Wallet, ClipboardList, CalendarDays, Mail, Pencil } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: 'ノーコードで構築',
    description: 'プログラミング不要。テンプレートを選んでカスタマイズするだけでAIエージェントが完成します。',
  },
  {
    icon: Brain,
    title: 'AI Brain設定',
    description: '自然言語でAIの性格や判断基準を定義。あなたのビジネスに最適化されたAIが動きます。',
  },
  {
    icon: Zap,
    title: 'ワークフロー自動化',
    description: 'トリガー、AI判断、アクションを組み合わせて、日々の業務を自動化します。',
  },
  {
    icon: BarChart3,
    title: '実行ログ管理',
    description: '全ての実行結果を記録・可視化。エラーの追跡やパフォーマンスの改善に役立ちます。',
  },
] as const;

const TEMPLATES_PREVIEW = [
  { icon: Handshake, name: 'クライアントオンボーディング', category: 'クライアント管理' },
  { icon: Wallet, name: '請求リマインダー', category: '請求・見積' },
  { icon: ClipboardList, name: 'プロジェクト進捗レポート', category: 'プロジェクト管理' },
  { icon: CalendarDays, name: 'MTGスケジューラー', category: 'スケジュール' },
  { icon: Mail, name: 'メール自動分類', category: 'コミュニケーション' },
  { icon: Pencil, name: 'コンテンツスケジューラー', category: 'コンテンツ' },
] as const;

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-indigo-50 min-h-screen">
      <header className="px-4 pb-16 pt-12 text-center" data-testid="landing-hero">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700">
            フリーランスのための AI 自動化
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">AgentKit</span>
            <span className="block text-xl font-normal text-gray-500 mt-2">エージェントキット</span>
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            ノーコードでAIエージェントを構築し、フリーランス業務を自動化。
            クライアント対応、請求管理、レポート作成を任せて、本業に集中しましょう。
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-8 py-4 font-bold hover:shadow-lg hover:shadow-violet-200 transition-all"
              data-testid="cta-dashboard"
            >
              ダッシュボードを開く
            </Link>
            <Link
              href="/builder"
              className="rounded-xl border border-gray-200 bg-white px-6 py-4 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
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
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white/60 backdrop-blur-sm px-4 py-12" data-testid="landing-templates">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">すぐに使えるテンプレート</h2>
          <p className="mb-8 text-center text-sm text-gray-500">豊富なテンプレートから選んで、すぐにAIエージェントを稼働できます</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES_PREVIEW.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.name} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center" data-testid="landing-cta">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">今すぐAIエージェントを始めよう</h2>
          <p className="mb-6 text-sm text-gray-600">無料で始められます。クレジットカード不要。</p>
          <Link href="/builder" className="inline-block bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-8 py-4 font-bold hover:shadow-lg hover:shadow-violet-200 transition-all">
            無料で始める
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-500">
        <p>AgentKit - フリーランスのためのAIエージェントビルダー</p>
      </footer>
    </div>
  );
}
