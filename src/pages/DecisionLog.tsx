import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import { decisionItems } from '../data/mockData';

export default function DecisionLog() {
  return (
    <div>
      <Topbar
        title="Decision Log"
        subtitle="Institutional memory · Riverside Mixed-Use"
        actions={
          <>
            <BackButton />
            <button className="btn-primary">+ Log decision</button>
          </>
        }
      />
      <Card title="Recent decisions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AlertList items={decisionItems} />
        </div>
      </Card>
    </div>
  );
}
