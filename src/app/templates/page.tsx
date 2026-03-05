'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES, DIFFICULTY_LABELS } from '@/data/templates';

type CategoryFilter = 'all' | keyof typeof TEMPLATE_CATEGORIES;

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>(() => 'all');

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return AGENT_TEMPLATES;
    return AGENT_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="templates-page">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">テンプレートライブラリ</h1>
        <p className="text-sm text-gray-500">フリーランス業務に特化したAIエージェントテンプレート</p>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex flex-wrap gap-2" data-testid="category-filter">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          data-testid="filter-all"
        >
          すべて ({AGENT_TEMPLATES.length})
        </button>
        {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => {
          const count = AGENT_TEMPLATES.filter((t) => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as CategoryFilter)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid={`filter-${key}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 sm:grid-cols-2" data-testid="template-grid">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            data-testid="template-card"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${template.color}15` }}
                >
                  {template.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <span className="text-xs text-gray-400">
                    {TEMPLATE_CATEGORIES[template.category]}
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[template.difficulty]}`}
                data-testid="difficulty-badge"
              >
                {DIFFICULTY_LABELS[template.difficulty]}
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-600">{template.description}</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {template.steps.map((step) => (
                <span
                  key={step.id}
                  className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {step.type === 'trigger' ? '⚡' : step.type === 'ai_decision' ? '🧠' : step.type === 'condition' ? '🔀' : '▶️'}
                  {' '}{step.label}
                </span>
              ))}
            </div>
            <Link
              href={`/editor?template=${template.id}`}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              data-testid="use-template-btn"
            >
              このテンプレートを使う
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
