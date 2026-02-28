import StatusBadge from '@/components/StatusBadge';
import type { Agent } from '@/types';

interface AgentCardProps {
  agent: Agent;
  onToggleStatus: (id: string) => void;
}

export default function AgentCard({ agent, onToggleStatus }: AgentCardProps) {
  const canToggle = agent.status === 'active' || agent.status === 'paused';

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      data-testid={`agent-card-${agent.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
          style={{ backgroundColor: agent.color + '20' }}
          aria-hidden="true"
        >
          {agent.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{agent.name}</h3>
            <StatusBadge status={agent.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{agent.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span>{agent.steps.length} ステップ</span>
            <span>更新: {new Date(agent.updatedAt).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
        {canToggle && (
          <button
            onClick={() => onToggleStatus(agent.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              agent.status === 'active'
                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            aria-label={agent.status === 'active' ? `${agent.name}を一時停止` : `${agent.name}を再開`}
          >
            {agent.status === 'active' ? '一時停止' : '再開'}
          </button>
        )}
      </div>
    </div>
  );
}
