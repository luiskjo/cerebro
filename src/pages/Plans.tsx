import Topbar from '../components/Topbar';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import AlertList from '../components/AlertList';
import { planConflicts } from '../data/mockData';

export default function Plans() {
  return (
    <div>
      <Topbar
        title="Plan Review Agent"
        subtitle="Riverside Mixed-Use · Rev 3"
        actions={
          <>
            <BackButton />
            <button className="btn-primary">Ask Cerebro ↗</button>
          </>
        }
      />
      <Card title="Conflicts & flags">
        <AlertList items={planConflicts} />
      </Card>
    </div>
  );
}
