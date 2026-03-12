'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Wrench, ScrollText, FileText, Link2, Brain, Wallet, Zap, Shield, MessageSquare, MoreHorizontal, Bot } from 'lucide-react';

const MAIN_NAV = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/editor', label: 'エディタ', icon: Wrench },
  { href: '/logs', label: 'ログ', icon: ScrollText },
] as const;

const MORE_NAV = [
  { href: '/templates', label: 'テンプレート', icon: FileText },
  { href: '/nodes', label: 'ノード', icon: Link2 },
  { href: '/models', label: 'LLMモデル', icon: Brain },
  { href: '/cost', label: 'コスト分析', icon: Wallet },
  { href: '/benchmark', label: 'ベンチマーク', icon: Zap },
  { href: '/errors', label: 'エラー対策', icon: Shield },
  { href: '/advisory', label: 'アドバイザリー', icon: MessageSquare },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isMoreActive = MORE_NAV.some((item) => pathname.startsWith(item.href));

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMoreOpen(false);
    }
  }, []);

  useEffect(() => {
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [moreOpen, handleClickOutside]);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100" data-testid="navigation">
      <div className="mx-auto flex max-w-lg items-center justify-between px-3 py-2">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 hidden sm:block text-sm">AgentKit</span>
        </Link>
        <div className="flex items-center gap-1">
          {MAIN_NAV.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
                data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1)}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          {/* More dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isMoreActive || moreOpen
                  ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
              data-testid="nav-more"
              aria-expanded={moreOpen}
              aria-label="その他のメニュー"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">その他</span>
            </button>
            {moreOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-48 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-100 shadow-lg py-1 z-50"
                data-testid="more-menu"
              >
                {MORE_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-indigo-700'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      data-testid={`nav-${item.href.slice(1)}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
