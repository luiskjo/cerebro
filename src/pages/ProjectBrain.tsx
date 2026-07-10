import { Link } from 'react-router-dom';
import Topbar from '../components/Topbar';
import MetricGrid from '../components/MetricGrid';
import InsightBanner from '../components/InsightBanner';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import AgentGrid from '../components/AgentGrid';
import RiskList from '../components/RiskList';
import FeedList from '../components/FeedList';
import ChatBar from '../components/ChatBar';
import { useTheme } from '../context/ThemeContext';
import { brainAlerts, brainMetrics, activeAgents, riskRows, weekFeed, project } from '../data/mockData';

export default function ProjectBrain() {
  const { isDark } = useTheme();

  return (
    <div>
      <Topbar
        title="Project Brain"
        subtitle={`${project.dateLabel} · Good ${isDark ? 'evening' : 'morning'}, Juan`}
        actions={
          <>
            <div className="chip">{isDark ? '🌙 Evening briefing' : '☀️ Morning briefing'}</div>
            <button className="btn-primary">
              <i className="ti ti-brain" style={{ fontSize: 15 }} /> Ask Cerebro
            </button>
          </>
        }
      />

      <MetricGrid metrics={brainMetrics} />

      <InsightBanner
        label="Cerebro · Morning intelligence brief"
        time="Jun 3, 2026 · 7:02 AM · Scanning all agents"
        cta="View full briefing →"
        navigateTo="/briefing"
        body={
          <>
            <strong>Critical today:</strong> Electrical rough-in Zone C is 6 days behind with only 8 days of float
            before the MEP inspection on Jun 10 — a crew redeployment decision is needed this morning. Your owner's
            acceleration request from Jun 1 OAC is still unanswered. MEP fixtures have an 8-week lead time and the
            order has not been placed — this will become a drywall crisis if not acted on this week.
          </>
        }
        tags={[
          { label: 'Recovery plan Zone C →', navigateTo: '/schedule' },
          { label: 'Draft owner response →' },
          { label: 'MEP fixture order →', navigateTo: '/materials' },
          { label: 'Full briefing →', navigateTo: '/briefing' },
        ]}
      />

      <div className="grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Priority alerts">
            <AlertList items={brainAlerts} />
          </Card>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Active agents</div>
              <button className="btn-outline" style={{ fontSize: 11, padding: '5px 12px' }}>+ Add agent</button>
            </div>
            <AgentGrid agents={activeAgents} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Project health">
            <RiskList rows={riskRows} />
          </Card>
          <Card title="This week">
            <FeedList rows={weekFeed} />
          </Card>
          <Card
            title="🧠 Cerebro watching"
            titleColor="var(--purple)"
            style={{ background: 'var(--purple-light)', borderColor: 'rgba(124,58,237,.2)' }}
          >
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 12 }}>
              MEP fixtures need to be ordered today. 8-week lead time puts drywall phase at risk if not placed this
              week.
            </div>
            <Link className="itag" to="/materials" style={{ fontSize: 11, textDecoration: 'none' }}>
              What should I do? →
            </Link>
          </Card>
        </div>
      </div>

      <ChatBar />
    </div>
  );
}
