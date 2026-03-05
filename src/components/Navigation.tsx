'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MAIN_NAV = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/dashboard', label: 'ダッシュボード', icon: '📊' },
  { href: '/editor', label: 'エディタ', icon: '🔧' },
  { href: '/logs', label: 'ログ', icon: '📜' },
] as const;

const MORE_NAV = [
  { href: '/templates', label: 'テンプレート', icon: '📋' },
  { href: '/nodes', label: 'ノード', icon: '🔗' },
  { href: '/models', label: 'LLMモデル', icon: '🧠' },
  { href: '/cost', label: 'コスト分析', icon: '💰' },
  { href: '/benchmark', label: 'ベンチマーク', icon: '⚡' },
  { href: '/errors', label: 'エラー対策', icon: '🛡️' },
  { href: '/advisory', label: 'アドバイザリー', icon: '📝' },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm" data-testid="navigation">
      {/* More Menu Popup */}
      {moreOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 right-0 border-t border-gray-200 bg-white shadow-lg"
          data-testid="more-menu"
        >
          <div className="mx-auto max-w-lg grid grid-cols-4 gap-1 px-2 py-3">
            {MORE_NAV.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  data-testid={`nav-${item.href.slice(1)}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-lg items-center justify-around">
        {MAIN_NAV.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                isActive
                  ? 'text-indigo-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`nav-${item.href === '/' ? 'home' : item.href.slice(1)}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
            isMoreActive || moreOpen
              ? 'text-indigo-600 font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          data-testid="nav-more"
          aria-expanded={moreOpen}
          aria-label="その他のメニュー"
        >
          <span className="text-xl">{'⋯'}</span>
          <span>その他</span>
        </button>
      </div>
    </nav>
  );
}
