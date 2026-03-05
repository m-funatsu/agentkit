const STEP_ICONS = {
  trigger: { icon: '⚡', label: 'トリガー', color: 'bg-amber-100 text-amber-700' },
  ai_decision: { icon: '🧠', label: 'AI判断', color: 'bg-purple-100 text-purple-700' },
  action: { icon: '▶️', label: 'アクション', color: 'bg-blue-100 text-blue-700' },
  condition: { icon: '🔀', label: '条件分岐', color: 'bg-teal-100 text-teal-700' },
} as const;

interface StepTypeIconProps {
  type: keyof typeof STEP_ICONS;
  size?: 'sm' | 'md' | 'lg';
}

export default function StepTypeIcon({ type, size = 'md' }: StepTypeIconProps) {
  const config = STEP_ICONS[type];
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  } as const;

  return (
    <div
      className={`flex items-center justify-center rounded-lg ${config.color} ${sizeClasses[size]}`}
      title={config.label}
      data-testid="step-type-icon"
    >
      {config.icon}
    </div>
  );
}
