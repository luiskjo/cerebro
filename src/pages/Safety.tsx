import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import MetricGrid from '../components/MetricGrid';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import { safetyMetrics, safetyItems, project } from '../data/mockData';

export default function Safety() {
  return (
    <div>
      <Topbar
        title="Safety Agent"
        subtitle={`${project.name} · Week 14`}
        actions={
          <>
            <BackButton />
            <button className="btn-primary">Ask Cerebro ↗</button>
          </>
        }
      />
      <MetricGrid metrics={safetyMetrics} columns={4} />
      <Card title="Open items">
        <AlertList items={safetyItems} />
      </Card>
    </div>
  );
}
