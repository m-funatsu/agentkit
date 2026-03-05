const STATUS_STYLES = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: '下書き' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: '稼働中' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '一時停止' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: 'エラー' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', label: '実行中' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: '完了' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: '失敗' },
  awaiting_approval: { bg: 'bg-purple-100', text: 'text-purple-700', label: '承認待ち' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待機中' },
} as const;

type StatusType = keyof typeof STATUS_STYLES;

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      data-testid="status-badge"
    >
      {style.label}
    </span>
  );
}
