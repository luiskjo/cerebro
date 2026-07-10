import { useNavigate } from 'react-router-dom';
import type { AgentCardData } from '../data/mockData';

export default function AgentGrid({ agents }: { agents: AgentCardData[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid-agents">
      {agents.map((agent) => (
        <div className="agent-card" key={agent.name} onClick={() => navigate(agent.navigateTo)}>
          <div className="agent-head">
            <div className="agent-ico" style={{ background: agent.iconBg }}>
              {agent.icon}
            </div>
            <div>
              <div className="agent-nm">{agent.name}</div>
              <div className="agent-st">{agent.status}</div>
            </div>
          </div>
          <div className="agent-sum">{agent.summary}</div>
          {agent.footer && (
            <>
              <div className="prog-bar">
                <div className="prog-fill" style={{ width: `${agent.progressPct}%`, background: agent.progressColor }} />
              </div>
              <div className="agent-pct">{agent.footer}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
