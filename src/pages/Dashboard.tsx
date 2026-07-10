import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import MetricGrid from '../components/MetricGrid';
import AgentGrid from '../components/AgentGrid';
import { dashboardMetrics, dashboardAgents, project } from '../data/mockData';

export default function Dashboard() {
  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle={`${project.name} · All agents · Week 14`}
        actions={<BackButton />}
      />
      <MetricGrid metrics={dashboardMetrics} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AgentGrid agents={dashboardAgents} />
      </div>
    </div>
  );
}
